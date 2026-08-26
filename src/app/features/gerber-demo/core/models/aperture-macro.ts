import { GerberParseError } from '../errors';
import { evaluateMacroExpression } from '../parser/macro-expression';
import { CoordinatePoint } from './coordinate-point';
import { MacroCircleShape, MacroOutlineShape, MacroShape } from './macro-shape';

/** One statement inside a `%AM..*%` block. */
export type MacroStatement = MacroVariableStatement | MacroPrimitiveStatement;

/** A variable assignment such as `$4=$1x0.75`. */
export class MacroVariableStatement {
  readonly kind = 'variable' as const;

  constructor(
    readonly variableIndex: number,
    readonly expression: string,
  ) {}

  toString(): string {
    return `$${this.variableIndex}=${this.expression}`;
  }
}

/** A drawing primitive such as `21,1,1.5347,0.4208,0,0,180.0`. */
export class MacroPrimitiveStatement {
  readonly kind = 'primitive' as const;

  constructor(
    /** 1 circle, 4 outline, 5 polygon, 20 vector line, 21 centre line, 22 lower-left line. */
    readonly code: number,
    /** Unevaluated argument expressions, in declaration order (exposure first). */
    readonly args: readonly string[],
  ) {}

  toString(): string {
    return `${this.code},${this.args.join(',')}`;
  }
}

/** Primitive codes this implementation understands; 6 (moiré) and 7 (thermal) are not supported. */
const SUPPORTED_PRIMITIVES = new Set([0, 1, 2, 4, 5, 20, 21, 22]);

/**
 * An aperture-macro template (`%AMname*...%`). The template is stored unevaluated; each
 * `%ADDnn<name>,args*%` that references it calls `evaluate` with its own arguments to produce
 * concrete geometry.
 */
export class ApertureMacro {
  constructor(
    readonly name: string,
    readonly statements: readonly MacroStatement[],
  ) {}

  /**
   * Resolves the macro into concrete shapes. `args` bind to `$1`, `$2`, ... in order.
   */
  evaluate(args: readonly number[]): MacroShape[] {
    const variables = new Map<number, number>();
    for (let i = 0; i < args.length; i++) variables.set(i + 1, args[i]);

    const shapes: MacroShape[] = [];
    for (const statement of this.statements) {
      if (statement.kind === 'variable') {
        variables.set(
          statement.variableIndex,
          evaluateMacroExpression(statement.expression, variables),
        );
        continue;
      }

      const shape = this.buildPrimitive(statement, variables);
      if (shape !== null) shapes.push(shape);
    }

    return shapes;
  }

  private buildPrimitive(
    primitive: MacroPrimitiveStatement,
    variables: ReadonlyMap<number, number>,
  ): MacroShape | null {
    if (!SUPPORTED_PRIMITIVES.has(primitive.code))
      throw new GerberParseError(
        `Aperture macro '${this.name}' uses unsupported primitive ${primitive.code} ` +
          `(moire and thermal primitives are not implemented).`,
      );

    // Code 0 is a comment primitive; it draws nothing.
    if (primitive.code === 0) return null;

    const p = primitive.args.map((expression) => evaluateMacroExpression(expression, variables));
    const arg = (index: number) => (index < p.length ? p[index] : 0);

    // Primitive 2 is the deprecated spelling of 20 (vector line).
    const code = primitive.code === 2 ? 20 : primitive.code;

    switch (code) {
      case 1:
        return buildCircle(p, arg);
      case 4:
        return this.buildOutline(primitive, p);
      case 5:
        return this.buildRegularPolygon(p, arg);
      case 20:
        return buildVectorLine(p, arg);
      case 21:
        return buildCenterLine(p, arg);
      case 22:
        return buildLowerLeftLine(p, arg);
      default:
        return null;
    }
  }

  // 4: exposure, vertex count, start X, start Y, (X, Y) x n, rotation
  private buildOutline(primitive: MacroPrimitiveStatement, p: number[]): MacroShape {
    require(p, 5, 'outline');
    const vertexCount = Math.round(p[1]);
    if (vertexCount < 1)
      throw new GerberParseError(
        `Aperture macro '${this.name}' declares an outline with ${vertexCount} vertices.`,
      );

    // The spec counts the subsequent points, so the point list holds vertexCount + 1 pairs
    // (the last repeating the first). Tolerate writers that omit the closing repeat.
    const available = Math.floor((p.length - 3) / 2);
    const pointCount = Math.min(vertexCount + 1, available);
    if (pointCount < 3)
      throw new GerberParseError(
        `Aperture macro '${this.name}' outline has ${pointCount} points; at least 3 are required. ` +
          `Statement: ${primitive}`,
      );

    const rotation = p.length > 2 + pointCount * 2 ? p[p.length - 1] : 0;
    const vertices: CoordinatePoint[] = [];
    for (let i = 0; i < pointCount; i++) {
      vertices.push(rotate(new CoordinatePoint(p[2 + i * 2], p[3 + i * 2]), rotation));
    }

    return new MacroOutlineShape(isOn(p[0]), vertices);
  }

  // 5: exposure, vertex count, centre X, centre Y, diameter, rotation
  private buildRegularPolygon(p: number[], arg: (index: number) => number): MacroShape {
    require(p, 5, 'polygon');
    const vertexCount = Math.round(arg(1));
    if (vertexCount < 3)
      throw new GerberParseError(
        `Aperture macro '${this.name}' declares a polygon with ${vertexCount} vertices.`,
      );

    const center = new CoordinatePoint(arg(2), arg(3));
    const radius = arg(4) / 2;
    const rotation = arg(5);

    const vertices: CoordinatePoint[] = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (2 * Math.PI * i) / vertexCount;
      const vertex = center.offset(radius * Math.cos(angle), radius * Math.sin(angle));
      vertices.push(rotate(vertex, rotation));
    }

    return new MacroOutlineShape(isOn(arg(0)), vertices);
  }

  toString(): string {
    return `${this.name} (${this.statements.length} statements)`;
  }
}

// 1: exposure, diameter, centre X, centre Y [, rotation]
function buildCircle(p: number[], arg: (index: number) => number): MacroShape {
  require(p, 4, 'circle');
  const center = rotate(new CoordinatePoint(arg(2), arg(3)), arg(4));
  return new MacroCircleShape(isOn(arg(0)), center, arg(1));
}

// 20: exposure, width, start X, start Y, end X, end Y, rotation
function buildVectorLine(p: number[], arg: (index: number) => number): MacroShape {
  require(p, 6, 'vector line');
  const width = arg(1);
  const start = new CoordinatePoint(arg(2), arg(3));
  const end = new CoordinatePoint(arg(4), arg(5));
  const rotation = arg(6);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return new MacroOutlineShape(isOn(arg(0)), [start, start, start, start]);

  // Offset both endpoints by half the width along the segment normal.
  const nx = (-dy / length) * (width / 2);
  const ny = (dx / length) * (width / 2);

  return new MacroOutlineShape(isOn(arg(0)), [
    rotate(start.offset(nx, ny), rotation),
    rotate(end.offset(nx, ny), rotation),
    rotate(end.offset(-nx, -ny), rotation),
    rotate(start.offset(-nx, -ny), rotation),
  ]);
}

// 21: exposure, width, height, centre X, centre Y, rotation
function buildCenterLine(p: number[], arg: (index: number) => number): MacroShape {
  require(p, 5, 'centre line');
  const center = new CoordinatePoint(arg(3), arg(4));
  return new MacroOutlineShape(
    isOn(arg(0)),
    rotatedRectangle(center, arg(1) / 2, arg(2) / 2, arg(5)),
  );
}

// 22: exposure, width, height, lower-left X, lower-left Y, rotation
function buildLowerLeftLine(p: number[], arg: (index: number) => number): MacroShape {
  require(p, 5, 'lower-left line');
  const halfWidth = arg(1) / 2;
  const halfHeight = arg(2) / 2;
  const center = new CoordinatePoint(arg(3) + halfWidth, arg(4) + halfHeight);
  return new MacroOutlineShape(isOn(arg(0)), rotatedRectangle(center, halfWidth, halfHeight, arg(5)));
}

function rotatedRectangle(
  center: CoordinatePoint,
  halfWidth: number,
  halfHeight: number,
  rotation: number,
): CoordinatePoint[] {
  return [
    rotate(center.offset(-halfWidth, -halfHeight), rotation),
    rotate(center.offset(halfWidth, -halfHeight), rotation),
    rotate(center.offset(halfWidth, halfHeight), rotation),
    rotate(center.offset(-halfWidth, halfHeight), rotation),
  ];
}

/** Rotates counter-clockwise about the macro origin, which is what the spec mandates. */
function rotate(point: CoordinatePoint, degrees: number): CoordinatePoint {
  if (degrees === 0) return point;

  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return new CoordinatePoint(
    point.x * cos - point.y * sin,
    point.x * sin + point.y * cos,
  );
}

function isOn(exposure: number): boolean {
  return exposure !== 0;
}

function require(p: number[], count: number, primitiveName: string): void {
  if (p.length < count)
    throw new GerberParseError(
      `Macro ${primitiveName} primitive needs at least ${count} parameters but got ${p.length}.`,
    );
}
