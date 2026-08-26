import { Aperture } from './aperture';
import { ApertureMacro } from './aperture-macro';
import { BoundingBox } from './bounding-box';
import { CoordinateFormat } from './coordinate-format';
import { GerberElement, GerberElementType } from './gerber-element';
import { GerberUnit } from './gerber-unit';

/**
 * Everything a parsed Gerber file contains: the format it declared, its aperture dictionary,
 * the drawing operations in file order, and the extent they cover.
 */
export class GerberData {
  constructor(
    /** Source file name, when the data came from a file. */
    readonly fileName: string | null,
    /** Units all coordinates and aperture dimensions in this object are expressed in. */
    readonly unit: GerberUnit,
    readonly format: CoordinateFormat,
    /** Aperture dictionary keyed by D-code. */
    readonly apertures: ReadonlyMap<number, Aperture>,
    /** Macro templates keyed by name. */
    readonly macros: ReadonlyMap<string, ApertureMacro>,
    /** Drawing operations in the order they appear in the file. */
    readonly elements: readonly GerberElement[],
    readonly boundingBox: BoundingBox,
    /** File attributes from `%TF..*%` and Altium's `G04 #@! TF..` comments. */
    readonly attributes: ReadonlyMap<string, string>,
    /** Raw G04 comment text, in file order. */
    readonly comments: readonly string[],
    /** Constructs that were recognised but skipped, so the UI can say what it ignored. */
    readonly warnings: readonly string[],
  ) {}

  get flashCount(): number {
    return this.elements.filter((e) => e.type === GerberElementType.Flash).length;
  }

  get drawCount(): number {
    return this.elements.filter((e) => e.type === GerberElementType.Draw).length;
  }

  /** Looks up the aperture an element used, or null when the file referenced an undefined D-code. */
  getAperture(element: GerberElement): Aperture | null {
    return this.apertures.get(element.apertureCode) ?? null;
  }
}
