import { CoordinateFormatError } from '../errors';
import { padCode, tryParseDigits, tryParseFloat, tryParseInteger } from '../numbers';
import { Aperture, ApertureType } from '../models/aperture';
import {
  ApertureMacro,
  MacroPrimitiveStatement,
  MacroStatement,
  MacroVariableStatement,
} from '../models/aperture-macro';
import { BoundingBox } from '../models/bounding-box';
import {
  CoordinateFormat,
  CoordinateNotation,
  ZeroOmission,
} from '../models/coordinate-format';
import { CoordinatePoint } from '../models/coordinate-point';
import { GerberData } from '../models/gerber-data';
import { GerberElement, Polarity } from '../models/gerber-element';
import { GerberUnit } from '../models/gerber-unit';

const FORMAT_PATTERN = /^FS(?<zeros>[LTD])?(?<notation>[AI])?X(?<xi>\d)(?<xd>\d)Y(?<yi>\d)(?<yd>\d)/;

// The `s` flag matches .NET's default `.` behaviour on a segment that may span lines.
const APERTURE_PATTERN = /^ADD(?<code>\d+)(?<template>[^,]+)(?:,(?<parameters>.*))?$/s;

/**
 * Reads RS-274X (extended Gerber) into a `GerberData` graph.
 *
 * Supported: %FS number format, %MO units, the C/R/O/P standard aperture templates, %AM aperture
 * macros (primitives 1, 4, 5, 20, 21, 22 with variables and arithmetic), %LP polarity, %TF/%TA/%TO
 * attributes plus Altium's "G04 #@!" attribute comments, D01 linear draws, D02 moves, D03 flashes,
 * modal coordinates, and absolute or incremental notation.
 *
 * Not supported, recorded in `GerberData.warnings` rather than thrown: G02/G03 arcs (approximated
 * by their chord), G36/G37 regions, and %SR step-and-repeat.
 */
export class GerberParser {
  private readonly apertures = new Map<number, Aperture>();
  private readonly macros = new Map<string, ApertureMacro>();
  private readonly attributes = new Map<string, string>();
  private readonly elements: GerberElement[] = [];
  private readonly comments: string[] = [];
  private readonly warnings: string[] = [];
  private readonly warnedOnce = new Set<string>();
  private readonly bounds = new BoundingBox();

  private unit = GerberUnit.Millimeters;
  private format = CoordinateFormat.default;
  private sawUnits = false;
  private sawFormat = false;

  private currentPoint = CoordinatePoint.origin;
  private currentAperture: number | null = null;
  private polarity = Polarity.Dark;
  private interpolationMode = 1;
  private lastOperation = 2;
  private inRegion = false;
  private endOfFile = false;

  private constructor() {}

  /** Parses Gerber source held in memory. */
  static parse(content: string, fileName: string | null = null): GerberData {
    if (content === null || content === undefined)
      throw new TypeError('Gerber content is required.');

    return new GerberParser().run(content, fileName);
  }

  /** Parses a `File` picked from disk or dropped onto the page. */
  static async parseFile(file: File): Promise<GerberData> {
    return GerberParser.parse(await file.text(), file.name);
  }

  private run(content: string, fileName: string | null): GerberData {
    let index = 0;
    let line = 1;

    while (index < content.length && !this.endOfFile) {
      const c = content[index];
      if (c === '\n') {
        line++;
        index++;
        continue;
      }

      if (/\s/.test(c)) {
        index++;
        continue;
      }

      const blockLine = line;
      if (c === '%') {
        const close = content.indexOf('%', index + 1);
        if (close < 0) {
          this.warn(blockLine, 'Unterminated extended command; the rest of the file was ignored.');
          break;
        }

        const inner = content.slice(index + 1, close);
        line += countNewlines(inner);
        this.handleExtendedCommand(inner, blockLine);
        index = close + 1;
      } else {
        const star = content.indexOf('*', index);
        if (star < 0) {
          this.warn(blockLine, 'Unterminated command block; the rest of the file was ignored.');
          break;
        }

        const block = content.slice(index, star);
        line += countNewlines(block);
        this.handleFunctionBlock(block, blockLine);
        index = star + 1;
      }
    }

    if (!this.sawFormat) this.warn(0, `No %FS format specification; assumed ${this.format}.`);
    if (!this.sawUnits) this.warn(0, `No %MO units specification; assumed ${this.unit}.`);
    if (!this.endOfFile) this.warn(0, 'File ended without an M02 end-of-file command.');

    return new GerberData(
      fileName,
      this.unit,
      this.format,
      this.apertures,
      this.macros,
      this.elements,
      this.bounds,
      this.attributes,
      this.comments,
      this.warnings,
    );
  }

  // ---------------------------------------------------------------- extended (%..%) commands

  private handleExtendedCommand(inner: string, line: number): void {
    const trimmed = inner.trim();
    if (trimmed.length === 0) return;

    // A macro definition spans several *-terminated segments, so it owns the whole block.
    if (trimmed.startsWith('AM')) {
      this.handleApertureMacro(trimmed, line);
      return;
    }

    for (const segment of splitSegments(inner)) this.handleExtendedSegment(segment, line);
  }

  private handleExtendedSegment(segment: string, line: number): void {
    if (segment.length < 2) {
      this.warn(line, `Ignored malformed extended command '${segment}'.`);
      return;
    }

    const code = segment.slice(0, 2);
    switch (code) {
      case 'FS':
        this.handleFormatSpecification(segment, line);
        break;

      case 'MO':
        this.handleUnits(segment, line);
        break;

      case 'AD':
        this.handleApertureDefinition(segment, line);
        break;

      case 'LP':
        this.polarity =
          segment.length > 2 && segment[2].toUpperCase() === 'C' ? Polarity.Clear : Polarity.Dark;
        break;

      case 'TF':
      case 'TA':
      case 'TO':
        this.handleAttribute(segment);
        break;

      case 'TD':
        // Attribute delete; nothing downstream depends on attribute scoping.
        break;

      case 'SR':
        this.warnOnce(
          line,
          'step-and-repeat',
          '%SR step-and-repeat is not supported; blocks are drawn once.',
        );
        break;

      case 'AB':
        this.warnOnce(
          line,
          'block-aperture',
          '%AB block apertures are not supported and were ignored.',
        );
        break;

      default:
        this.warnOnce(
          line,
          `ext-${code}`,
          `Ignored unsupported extended command '${code}'.`,
        );
        break;
    }
  }

  private handleFormatSpecification(segment: string, line: number): void {
    const match = FORMAT_PATTERN.exec(segment);
    if (match === null) {
      this.warn(line, `Could not read the format specification '${segment}'; kept ${this.format}.`);
      return;
    }

    const groups = match.groups!;
    const zeros = groups['zeros'] ?? 'L';
    const notation = groups['notation'] ?? 'A';

    const xInteger = Number(groups['xi']);
    const xDecimal = Number(groups['xd']);
    const yInteger = Number(groups['yi']);
    const yDecimal = Number(groups['yd']);

    if (xInteger !== yInteger || xDecimal !== yDecimal)
      this.warn(
        line,
        `X and Y formats differ (${xInteger}.${xDecimal} vs ${yInteger}.${yDecimal}); ` +
          `the X format was used for both.`,
      );

    try {
      this.format = new CoordinateFormat(
        xInteger,
        xDecimal,
        zeros === 'T' ? ZeroOmission.OmitTrailing : ZeroOmission.OmitLeading,
        notation === 'I' ? CoordinateNotation.Incremental : CoordinateNotation.Absolute,
      );
      this.sawFormat = true;
    } catch {
      // %FSLAX04Y04 and friends: the digit counts are outside the range the spec allows.
      this.warn(line, `Format specification '${segment}' is out of range; kept ${this.format}.`);
    }
  }

  private handleUnits(segment: string, line: number): void {
    const value = segment.slice(2).trim().toUpperCase();
    switch (value) {
      case 'MM':
        this.unit = GerberUnit.Millimeters;
        this.sawUnits = true;
        break;

      case 'IN':
        this.unit = GerberUnit.Inches;
        this.sawUnits = true;
        break;

      default:
        this.warn(line, `Unknown unit '${value}'; kept ${this.unit}.`);
        break;
    }
  }

  private handleApertureDefinition(segment: string, line: number): void {
    const match = APERTURE_PATTERN.exec(segment);
    if (match === null) {
      this.warn(line, `Could not read the aperture definition '${segment}'; it was skipped.`);
      return;
    }

    const groups = match.groups!;
    const code = Number(groups['code']);
    const template = groups['template'].trim();
    const parameters = this.parseApertureParameters(groups['parameters'] ?? '', segment, line);

    let aperture: Aperture;
    switch (template) {
      case 'C':
        aperture = new Aperture(code, ApertureType.Circle, parameters);
        break;

      case 'R':
        aperture = new Aperture(code, ApertureType.Rectangle, parameters);
        break;

      case 'O':
        aperture = new Aperture(code, ApertureType.Obround, parameters);
        break;

      case 'P':
        aperture = new Aperture(code, ApertureType.Polygon, parameters);
        break;

      default: {
        const macro = this.macros.get(template) ?? null;
        if (macro === null)
          this.warn(
            line,
            `Aperture D${code} references undefined macro '${template}'; it will not render.`,
          );

        aperture = new Aperture(code, ApertureType.Macro, parameters, template, macro);
        break;
      }
    }

    if (this.apertures.has(code)) this.warn(line, `Aperture D${code} was redefined.`);

    this.apertures.set(code, aperture);
  }

  private parseApertureParameters(raw: string, segment: string, line: number): number[] {
    if (raw.trim().length === 0) return [];

    const parts = raw
      .split('X')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    return parts.map((part) => {
      const value = tryParseFloat(part);
      if (value === null) {
        this.warn(
          line,
          `Aperture parameter '${part}' in '${segment}' is not a number; it was read as 0.`,
        );
        return 0;
      }

      return value;
    });
  }

  private handleApertureMacro(inner: string, line: number): void {
    const segments = splitSegments(inner);
    if (segments.length === 0) {
      this.warn(line, 'Empty aperture macro definition; it was skipped.');
      return;
    }

    const name = segments[0].slice(2).trim();
    if (name.length === 0) {
      this.warn(line, 'Aperture macro without a name; it was skipped.');
      return;
    }

    const statements: MacroStatement[] = [];
    for (let i = 1; i < segments.length; i++) {
      const statement = segments[i].trim();
      if (statement.length === 0) continue;

      if (statement[0] === '$') {
        const equals = statement.indexOf('=');
        if (equals < 0) {
          this.warn(
            line,
            `Macro '${name}' has an assignment without '=' ('${statement}'); it was skipped.`,
          );
          continue;
        }

        const variableIndex = tryParseDigits(statement.slice(1, equals));
        if (variableIndex === null) {
          this.warn(
            line,
            `Macro '${name}' assigns to an unreadable variable ('${statement}'); it was skipped.`,
          );
          continue;
        }

        statements.push(new MacroVariableStatement(variableIndex, statement.slice(equals + 1)));
        continue;
      }

      const comma = statement.indexOf(',');
      const codeText = (comma < 0 ? statement : statement.slice(0, comma)).trim();

      // Primitive 0 is a comment: free text follows, so it must not be split on commas.
      if (codeText.length > 0 && codeText[0] === '0') {
        statements.push(new MacroPrimitiveStatement(0, []));
        continue;
      }

      const code = tryParseInteger(codeText);
      if (code === null) {
        this.warn(
          line,
          `Macro '${name}' has a primitive with an unreadable code ('${statement}'); it was skipped.`,
        );
        continue;
      }

      const args =
        comma < 0
          ? []
          : statement
              .slice(comma + 1)
              .split(',')
              .map((part) => part.trim());

      statements.push(new MacroPrimitiveStatement(code, args));
    }

    this.macros.set(name, new ApertureMacro(name, statements));
  }

  private handleAttribute(segment: string): void {
    const body = segment.slice(2);
    const comma = body.indexOf(',');
    if (comma < 0) {
      this.attributes.set(body.trim(), '');
      return;
    }

    this.attributes.set(body.slice(0, comma).trim(), body.slice(comma + 1).trim());
  }

  // ---------------------------------------------------------------- function blocks

  private handleFunctionBlock(block: string, line: number): void {
    const trimmed = block.trim();
    if (trimmed.length === 0) return;

    if (trimmed.startsWith('G04')) {
      this.handleComment(trimmed.slice(3).trim(), line);
      return;
    }

    let gCode: number | null = null;
    let dCode: number | null = null;
    let mCode: number | null = null;
    let x: number | null = null;
    let y: number | null = null;

    let position = 0;
    while (position < trimmed.length) {
      const letter = trimmed[position];
      if (/\s/.test(letter)) {
        position++;
        continue;
      }

      position++;
      const start = position;
      while (position < trimmed.length && /[0-9+\-.]/.test(trimmed[position])) position++;

      const field = trimmed.slice(start, position);
      if (field.length === 0) {
        this.warnOnce(
          line,
          `empty-field-${letter}`,
          `Ignored '${letter}' with no value in block '${trimmed}'.`,
        );
        continue;
      }

      switch (letter.toUpperCase()) {
        case 'G':
          gCode = this.parseCode(field, letter, trimmed, line);
          break;

        case 'D':
          dCode = this.parseCode(field, letter, trimmed, line);
          break;

        case 'M':
          mCode = this.parseCode(field, letter, trimmed, line);
          break;

        case 'X':
          x = this.decodeCoordinate(field, trimmed, line);
          break;

        case 'Y':
          y = this.decodeCoordinate(field, trimmed, line);
          break;

        case 'I':
        case 'J':
          // Arc centre offsets; only meaningful for G02/G03, which are not rendered as arcs.
          break;

        case 'N':
          // Sequence number, no drawing effect.
          break;

        default:
          this.warnOnce(
            line,
            `letter-${letter}`,
            `Ignored unknown code letter '${letter}' in block '${trimmed}'.`,
          );
          break;
      }
    }

    if (gCode !== null) this.applyGCode(gCode, trimmed, line);

    if (mCode === 0 || mCode === 2) {
      this.endOfFile = true;
      return;
    }

    if (dCode !== null) {
      this.applyDCode(dCode, x, y, line);
    } else if (x !== null || y !== null) {
      // A coordinate-only block repeats the previous operation (deprecated, but still emitted).
      this.applyDCode(this.lastOperation, x, y, line);
    }
  }

  private handleComment(text: string, line: number): void {
    this.comments.push(text);

    // Altium embeds standard attributes in comments as "#@! TF.FilePolarity,Positive".
    const attributePrefix = '#@!';
    if (!text.startsWith(attributePrefix)) return;

    const payload = text.slice(attributePrefix.length).trim();
    const code = payload.slice(0, 2);
    if (payload.length >= 2 && (code === 'TF' || code === 'TA' || code === 'TO'))
      this.handleAttribute(payload);
    else if (payload.length > 0)
      this.warn(line, `Ignored unrecognised attribute comment '${payload}'.`);
  }

  private applyGCode(gCode: number, block: string, line: number): void {
    switch (gCode) {
      case 1:
      case 2:
      case 3:
        this.interpolationMode = gCode;
        if (gCode !== 1)
          this.warnOnce(
            line,
            'arc-mode',
            'G02/G03 arcs are not supported; they are drawn as straight chords.',
          );
        break;

      case 36:
        this.inRegion = true;
        this.warnOnce(
          line,
          'region',
          'G36/G37 regions are not supported; their contours were skipped.',
        );
        break;

      case 37:
        this.inRegion = false;
        break;

      case 70:
        this.unit = GerberUnit.Inches;
        this.sawUnits = true;
        break;

      case 71:
        this.unit = GerberUnit.Millimeters;
        this.sawUnits = true;
        break;

      case 74:
      case 75:
        // Quadrant mode only affects arcs, which are not rendered as arcs.
        break;

      case 90:
      case 91:
        this.warnOnce(
          line,
          'g90',
          `Deprecated G${padCode(gCode)} notation command ignored; %FS notation is used instead.`,
        );
        break;

      default:
        this.warnOnce(
          line,
          `g${gCode}`,
          `Ignored unsupported G${padCode(gCode)} in block '${block}'.`,
        );
        break;
    }
  }

  private applyDCode(dCode: number, x: number | null, y: number | null, line: number): void {
    if (dCode >= 10) {
      if (!this.apertures.has(dCode))
        this.warn(
          line,
          `Selected aperture D${dCode} before it was defined; drawing with it will be skipped.`,
        );

      this.currentAperture = dCode;
      return;
    }

    const target = this.resolveTarget(x, y);

    switch (dCode) {
      case 1:
        this.lastOperation = 1;
        if (!this.inRegion) this.addStroke(this.currentPoint, target, line);
        break;

      case 2:
        this.lastOperation = 2;
        break;

      case 3:
        this.lastOperation = 3;
        if (this.inRegion) this.warn(line, 'A flash inside a G36 region was skipped.');
        else this.addFlash(target, line);
        break;

      default:
        this.warn(line, `Ignored unsupported operation D${padCode(dCode)}.`);
        break;
    }

    this.currentPoint = target;
  }

  private resolveTarget(x: number | null, y: number | null): CoordinatePoint {
    return this.format.notation === CoordinateNotation.Absolute
      ? new CoordinatePoint(x ?? this.currentPoint.x, y ?? this.currentPoint.y)
      : this.currentPoint.offset(x ?? 0, y ?? 0);
  }

  private addStroke(from: CoordinatePoint, to: CoordinatePoint, line: number): void {
    const code = this.currentAperture;
    if (code === null) {
      this.warnOnce(
        line,
        'draw-no-aperture',
        'A draw was requested before any aperture was selected; it was skipped.',
      );
      return;
    }

    if (this.interpolationMode !== 1)
      this.warn(line, `Arc from ${from} to ${to} was drawn as a straight chord.`);

    this.elements.push(GerberElement.stroke(from, to, code, this.polarity, line));
    this.includeInBounds(from, code);
    this.includeInBounds(to, code);
  }

  private addFlash(at: CoordinatePoint, line: number): void {
    const code = this.currentAperture;
    if (code === null) {
      this.warnOnce(
        line,
        'flash-no-aperture',
        'A flash was requested before any aperture was selected; it was skipped.',
      );
      return;
    }

    this.elements.push(GerberElement.flash(at, code, this.polarity, line));
    this.includeInBounds(at, code);
  }

  private includeInBounds(point: CoordinatePoint, apertureCode: number): void {
    const aperture = this.apertures.get(apertureCode);
    if (aperture) this.bounds.includeEnvelope(point, aperture.halfWidth, aperture.halfHeight);
    else this.bounds.includePoint(point);
  }

  // ---------------------------------------------------------------- helpers

  private parseCode(field: string, letter: string, block: string, line: number): number | null {
    const value = tryParseInteger(field);
    if (value !== null) return value;

    this.warn(line, `Could not read '${letter}${field}' in block '${block}'; it was ignored.`);
    return null;
  }

  private decodeCoordinate(field: string, block: string, line: number): number | null {
    try {
      return this.format.decode(field);
    } catch (error) {
      if (!(error instanceof CoordinateFormatError)) throw error;

      this.warn(line, `Could not read coordinate '${field}' in block '${block}': ${error.message}`);
      return null;
    }
  }

  private warn(line: number, message: string): void {
    this.warnings.push(line > 0 ? `Line ${line}: ${message}` : message);
  }

  private warnOnce(line: number, key: string, message: string): void {
    if (this.warnedOnce.has(key)) return;

    this.warnedOnce.add(key);
    this.warn(line, message);
  }
}

function splitSegments(inner: string): string[] {
  return inner
    .split('*')
    .map((raw) => raw.trim())
    .filter((segment) => segment.length > 0);
}

function countNewlines(text: string): number {
  let count = 0;
  for (const c of text) {
    if (c === '\n') count++;
  }

  return count;
}
