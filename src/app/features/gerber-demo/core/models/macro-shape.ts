import { BoundingBox } from './bounding-box';
import { CoordinatePoint } from './coordinate-point';

/**
 * One resolved piece of an aperture macro, in macro-local coordinates (millimetres or inches to
 * match the file's units), already rotated. Every macro primitive collapses into either a circle
 * or a closed outline so renderers only ever deal with those two cases.
 */
export abstract class MacroShape {
  protected constructor(
    /** True for "on" (additive) shapes, false for "off" shapes that clear what is under them. */
    readonly exposure: boolean,
  ) {}

  abstract accumulateBounds(bounds: BoundingBox, origin: CoordinatePoint): void;
}

/** A filled circle, macro primitive 1. */
export class MacroCircleShape extends MacroShape {
  constructor(
    exposure: boolean,
    readonly center: CoordinatePoint,
    readonly diameter: number,
  ) {
    super(exposure);
  }

  get radius(): number {
    return this.diameter / 2;
  }

  override accumulateBounds(bounds: BoundingBox, origin: CoordinatePoint): void {
    bounds.includeEnvelope(
      origin.offset(this.center.x, this.center.y),
      this.radius,
      this.radius,
    );
  }
}

/**
 * A closed polygon. Macro primitives 4 (outline), 5 (regular polygon) and the line primitives
 * 20/21/22 are all normalised into this form.
 */
export class MacroOutlineShape extends MacroShape {
  constructor(
    exposure: boolean,
    readonly vertices: readonly CoordinatePoint[],
  ) {
    super(exposure);
  }

  override accumulateBounds(bounds: BoundingBox, origin: CoordinatePoint): void {
    for (const vertex of this.vertices) {
      bounds.includePoint(origin.offset(vertex.x, vertex.y));
    }
  }
}
