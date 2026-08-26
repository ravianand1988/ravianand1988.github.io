import { GerberParseError } from '../errors';
import { formatNumber } from '../numbers';
import { ApertureMacro } from './aperture-macro';
import { BoundingBox } from './bounding-box';
import { CoordinatePoint } from './coordinate-point';
import { MacroShape } from './macro-shape';

export enum ApertureType {
  /** Template C: a circle, optionally with a hole. */
  Circle = 'Circle',

  /** Template R: an axis-aligned rectangle. */
  Rectangle = 'Rectangle',

  /** Template O: a rectangle with fully rounded short ends (a stadium). */
  Obround = 'Obround',

  /** Template P: a regular polygon. */
  Polygon = 'Polygon',

  /** Any user-defined `%AM..*%` template. */
  Macro = 'Macro',
}

/**
 * One entry of the aperture dictionary, defined by `%ADDnn<template>,<params>*%`.
 * Dimensions are in the file's units.
 */
export class Aperture {
  private cachedMacroShapes: readonly MacroShape[] | null = null;

  constructor(
    /** The D-code, always >= 10. */
    readonly code: number,
    readonly type: ApertureType,
    /** Raw template parameters in declaration order. */
    readonly parameters: readonly number[],
    /** Set only when `type` is `Macro`. */
    readonly macroName: string | null = null,
    /** The referenced macro template, if it was defined before this aperture. */
    readonly macro: ApertureMacro | null = null,
  ) {
    if (code < 10)
      throw new GerberParseError(
        `Aperture code ${code} is reserved; user apertures start at D10.`,
      );
  }

  /** Circle diameter, or the outer diameter of a polygon. */
  get diameter(): number {
    return this.type === ApertureType.Circle || this.type === ApertureType.Polygon
      ? this.parameter(0)
      : 0;
  }

  /** X size of a rectangle or obround. */
  get width(): number {
    return this.type === ApertureType.Rectangle || this.type === ApertureType.Obround
      ? this.parameter(0)
      : this.diameter;
  }

  /** Y size of a rectangle or obround. */
  get height(): number {
    return this.type === ApertureType.Rectangle || this.type === ApertureType.Obround
      ? this.parameter(1)
      : this.diameter;
  }

  /** Vertex count of a polygon aperture. */
  get vertexCount(): number {
    return this.type === ApertureType.Polygon ? Math.round(this.parameter(1)) : 0;
  }

  /** Polygon rotation in degrees. */
  get rotation(): number {
    return this.type === ApertureType.Polygon ? this.parameter(2) : 0;
  }

  /** Diameter of the optional central hole, or 0 when there is none. */
  get holeDiameter(): number {
    switch (this.type) {
      case ApertureType.Circle:
        return this.parameter(1);
      case ApertureType.Rectangle:
      case ApertureType.Obround:
        return this.parameter(2);
      case ApertureType.Polygon:
        return this.parameter(3);
      default:
        return 0;
    }
  }

  /**
   * The macro geometry with this aperture's arguments applied. Evaluated once and cached.
   * Empty for non-macro apertures. Throws `GerberParseError` for unsupported primitives.
   */
  get macroShapes(): readonly MacroShape[] {
    if (this.type !== ApertureType.Macro || this.macro === null) return [];

    // Left uncached when evaluation throws, exactly as the lazy field in the .NET core does.
    return (this.cachedMacroShapes ??= this.macro.evaluate(this.parameters));
  }

  /** Half the aperture's X extent, used to grow the drawing's bounding box around a flash. */
  get halfWidth(): number {
    return this.envelope()[0];
  }

  /** Half the aperture's Y extent. */
  get halfHeight(): number {
    return this.envelope()[1];
  }

  private envelope(): [halfWidth: number, halfHeight: number] {
    switch (this.type) {
      case ApertureType.Circle:
      case ApertureType.Polygon:
        return [this.diameter / 2, this.diameter / 2];

      case ApertureType.Rectangle:
      case ApertureType.Obround:
        return [this.width / 2, this.height / 2];

      case ApertureType.Macro: {
        const bounds = new BoundingBox();
        for (const shape of this.macroShapes) shape.accumulateBounds(bounds, CoordinatePoint.origin);

        return bounds.isEmpty
          ? [0, 0]
          : [
              Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX)),
              Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY)),
            ];
      }

      default:
        return [0, 0];
    }
  }

  toString(): string {
    return this.type === ApertureType.Macro
      ? `D${this.code} ${this.macroName}`
      : `D${this.code} ${this.type} ${formatNumber(this.width, 4)}x${formatNumber(this.height, 4)}`;
  }

  private parameter(index: number): number {
    return index < this.parameters.length ? this.parameters[index] : 0;
  }
}
