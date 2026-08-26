import {
  Aperture,
  ApertureType,
  MacroCircleShape,
  MacroOutlineShape,
} from '../core';

export type Point = readonly [x: number, y: number];

/**
 * A drawable piece of an aperture in aperture-local coordinates (the aperture origin is the
 * flash point). `exposure` false means the piece clears whatever the earlier pieces of the same
 * aperture put down; only macros produce those.
 */
export type ApertureFigure =
  | { readonly kind: 'circle'; readonly center: Point; readonly radius: number; readonly exposure: boolean }
  | { readonly kind: 'polygon'; readonly points: readonly Point[]; readonly exposure: boolean }
  | {
      readonly kind: 'stadium';
      readonly center: Point;
      readonly width: number;
      readonly height: number;
      readonly exposure: boolean;
    };

/** How finely circles are polygonised when a stroke outline is needed. */
const CIRCLE_SEGMENTS = 32;

/**
 * Decomposes an aperture into the figures a renderer draws, in order. Throws `GerberParseError`
 * for macros that use an unsupported primitive, exactly as `Aperture.macroShapes` does.
 */
export function apertureFigures(aperture: Aperture): ApertureFigure[] {
  switch (aperture.type) {
    case ApertureType.Circle:
      return [{ kind: 'circle', center: [0, 0], radius: aperture.diameter / 2, exposure: true }];

    case ApertureType.Rectangle:
      return [
        {
          kind: 'polygon',
          points: rectanglePoints(aperture.width / 2, aperture.height / 2),
          exposure: true,
        },
      ];

    case ApertureType.Obround:
      return [
        {
          kind: 'stadium',
          center: [0, 0],
          width: aperture.width,
          height: aperture.height,
          exposure: true,
        },
      ];

    case ApertureType.Polygon:
      return [
        {
          kind: 'polygon',
          points: regularPolygonPoints(
            aperture.diameter / 2,
            aperture.vertexCount,
            aperture.rotation,
          ),
          exposure: true,
        },
      ];

    case ApertureType.Macro:
      return aperture.macroShapes.map((shape) => {
        if (shape instanceof MacroCircleShape)
          return {
            kind: 'circle' as const,
            center: [shape.center.x, shape.center.y] as Point,
            radius: shape.radius,
            exposure: shape.exposure,
          };

        const outline = shape as MacroOutlineShape;
        return {
          kind: 'polygon' as const,
          points: outline.vertices.map((v) => [v.x, v.y] as Point),
          exposure: outline.exposure,
        };
      });

    default:
      return [];
  }
}

/** True when the aperture has pieces that clear earlier ones, so it needs an isolated pass. */
export function hasClearFigures(figures: readonly ApertureFigure[]): boolean {
  return figures.some((figure) => !figure.exposure);
}

/**
 * A single closed outline that encloses the whole aperture, used to sweep an aperture along a
 * stroke. Non-convex macros are approximated by their convex hull.
 */
export function apertureOutline(aperture: Aperture): Point[] {
  const points: Point[] = [];
  for (const figure of apertureFigures(aperture)) {
    if (!figure.exposure) continue;
    points.push(...figurePoints(figure));
  }

  return convexHull(points);
}

function figurePoints(figure: ApertureFigure): Point[] {
  switch (figure.kind) {
    case 'circle':
      return circlePoints(figure.center, figure.radius);

    case 'polygon':
      return [...figure.points];

    case 'stadium': {
      const radius = Math.min(figure.width, figure.height) / 2;
      const dx = Math.max(figure.width / 2 - radius, 0);
      const dy = Math.max(figure.height / 2 - radius, 0);
      const [cx, cy] = figure.center;
      return [
        ...circlePoints([cx + dx, cy + dy], radius),
        ...circlePoints([cx - dx, cy - dy], radius),
      ];
    }
  }
}

function circlePoints(center: Point, radius: number): Point[] {
  const [cx, cy] = center;
  const points: Point[] = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const angle = (2 * Math.PI * i) / CIRCLE_SEGMENTS;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }

  return points;
}

function rectanglePoints(halfWidth: number, halfHeight: number): Point[] {
  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ];
}

function regularPolygonPoints(radius: number, vertexCount: number, rotationDegrees: number): Point[] {
  if (vertexCount < 3) return rectanglePoints(radius, radius);

  const rotation = (rotationDegrees * Math.PI) / 180;
  const points: Point[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = rotation + (2 * Math.PI * i) / vertexCount;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }

  return points;
}

/** Andrew's monotone chain, counter-clockwise. */
export function convexHull(points: readonly Point[]): Point[] {
  if (points.length < 3) return [...points];

  const sorted = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  const build = (source: readonly Point[]): Point[] => {
    const chain: Point[] = [];
    for (const point of source) {
      while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0)
        chain.pop();

      chain.push(point);
    }

    chain.pop();
    return chain;
  };

  const hull = [...build(sorted), ...build([...sorted].reverse())];
  return hull.length >= 3 ? hull : [...points];
}

function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
