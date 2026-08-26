import { CoordinatePoint } from './coordinate-point';

export enum GerberElementType {
  /** D01 with G01 in force: a straight stroke of the current aperture. */
  Draw = 'Draw',

  /** D03: a single stamp of the current aperture at `GerberElement.end`. */
  Flash = 'Flash',
}

/** Dark (LPD) adds material; clear (LPC) removes it from what is already drawn. */
export enum Polarity {
  Dark = 'Dark',
  Clear = 'Clear',
}

/**
 * One drawing operation, resolved into absolute coordinates in the file's units. D02 moves
 * produce no element, they only update the parser's current point.
 */
export class GerberElement {
  private constructor(
    readonly type: GerberElementType,
    /** Start of a stroke; equal to `end` for a flash. */
    readonly start: CoordinatePoint,
    /** End of a stroke, or the flash location. */
    readonly end: CoordinatePoint,
    /** The D-code of the aperture in force when this operation ran. */
    readonly apertureCode: number,
    readonly polarity: Polarity,
    /** Source line number, for diagnostics. */
    readonly lineNumber: number,
  ) {}

  static stroke(
    start: CoordinatePoint,
    end: CoordinatePoint,
    apertureCode: number,
    polarity: Polarity,
    lineNumber: number,
  ): GerberElement {
    return new GerberElement(
      GerberElementType.Draw,
      start,
      end,
      apertureCode,
      polarity,
      lineNumber,
    );
  }

  static flash(
    at: CoordinatePoint,
    apertureCode: number,
    polarity: Polarity,
    lineNumber: number,
  ): GerberElement {
    return new GerberElement(GerberElementType.Flash, at, at, apertureCode, polarity, lineNumber);
  }

  toString(): string {
    return this.type === GerberElementType.Flash
      ? `Flash D${this.apertureCode} at ${this.end}`
      : `Draw D${this.apertureCode} ${this.start} -> ${this.end}`;
  }
}
