import { formatNumber } from '../numbers';
import { CoordinatePoint } from './coordinate-point';

/**
 * Axis-aligned extent of everything drawn, accumulated as the parser walks the file.
 * Starts empty; `isEmpty` is true until the first point is included.
 */
export class BoundingBox {
  minX = Number.POSITIVE_INFINITY;
  minY = Number.POSITIVE_INFINITY;
  maxX = Number.NEGATIVE_INFINITY;
  maxY = Number.NEGATIVE_INFINITY;

  get isEmpty(): boolean {
    return !Number.isFinite(this.minX);
  }

  get width(): number {
    return this.isEmpty ? 0 : this.maxX - this.minX;
  }

  get height(): number {
    return this.isEmpty ? 0 : this.maxY - this.minY;
  }

  get center(): CoordinatePoint {
    return this.isEmpty
      ? CoordinatePoint.origin
      : new CoordinatePoint((this.minX + this.maxX) / 2, (this.minY + this.maxY) / 2);
  }

  include(x: number, y: number): void {
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
  }

  includePoint(point: CoordinatePoint): void {
    this.include(point.x, point.y);
  }

  /** Includes a point together with the envelope of the aperture flashed/drawn at it. */
  includeEnvelope(point: CoordinatePoint, halfWidth: number, halfHeight: number): void {
    this.include(point.x - halfWidth, point.y - halfHeight);
    this.include(point.x + halfWidth, point.y + halfHeight);
  }

  /** Grows the box by `margin` on every side (no-op while empty). */
  inflate(margin: number): BoundingBox {
    const result = new BoundingBox();
    if (this.isEmpty) return result;

    result.include(this.minX - margin, this.minY - margin);
    result.include(this.maxX + margin, this.maxY + margin);
    return result;
  }

  toString(): string {
    if (this.isEmpty) return '<empty>';

    const n = (value: number) => formatNumber(value, 3);
    return (
      `X ${n(this.minX)}..${n(this.maxX)}  Y ${n(this.minY)}..${n(this.maxY)}` +
      `  (${n(this.width)} x ${n(this.height)})`
    );
  }
}
