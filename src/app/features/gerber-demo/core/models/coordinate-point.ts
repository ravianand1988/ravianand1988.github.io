import { formatNumber } from '../numbers';
import { GerberUnit, toInches, toMillimeters } from './gerber-unit';

/**
 * A point in the file's native units (whatever %MO..*% declared). Immutable;
 * use `toMillimeters`/`toInches` to normalise before rendering.
 */
export class CoordinatePoint {
  static readonly origin = new CoordinatePoint(0, 0);

  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  withX(x: number): CoordinatePoint {
    return new CoordinatePoint(x, this.y);
  }

  withY(y: number): CoordinatePoint {
    return new CoordinatePoint(this.x, y);
  }

  offset(dx: number, dy: number): CoordinatePoint {
    return new CoordinatePoint(this.x + dx, this.y + dy);
  }

  /** Reinterprets this point, currently expressed in `unit`, in millimetres. */
  toMillimeters(unit: GerberUnit): CoordinatePoint {
    return unit === GerberUnit.Millimeters
      ? this
      : new CoordinatePoint(toMillimeters(unit, this.x), toMillimeters(unit, this.y));
  }

  /** Reinterprets this point, currently expressed in `unit`, in inches. */
  toInches(unit: GerberUnit): CoordinatePoint {
    return unit === GerberUnit.Inches
      ? this
      : new CoordinatePoint(toInches(unit, this.x), toInches(unit, this.y));
  }

  distanceTo(other: CoordinatePoint): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  equals(other: CoordinatePoint): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `(${formatNumber(this.x, 4)}, ${formatNumber(this.y, 4)})`;
  }
}
