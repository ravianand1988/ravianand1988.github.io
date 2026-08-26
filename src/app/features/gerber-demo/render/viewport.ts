import { BoundingBox } from '../core';

/**
 * Maps the file's coordinate space onto CSS pixels. Gerber's Y axis points up and the canvas's
 * points down, so the vertical term is negated:
 *
 *   screenX = worldX * scale + tx
 *   screenY = -worldY * scale + ty
 */
export interface ViewTransform {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

export const IDENTITY_VIEW: ViewTransform = { scale: 1, tx: 0, ty: 0 };

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 20000;

/** Scales and centres `bounds` inside a `width` x `height` viewport, leaving `padding` px around it. */
export function fitToBounds(
  bounds: BoundingBox,
  width: number,
  height: number,
  padding = 32,
): ViewTransform {
  if (bounds.isEmpty || width <= 0 || height <= 0)
    return { scale: 1, tx: width / 2, ty: height / 2 };

  const usableWidth = Math.max(width - 2 * padding, 1);
  const usableHeight = Math.max(height - 2 * padding, 1);

  // A single-point drawing has zero extent; fall back to a scale that keeps it visible.
  const scale = clampScale(
    Math.min(
      bounds.width > 0 ? usableWidth / bounds.width : Number.POSITIVE_INFINITY,
      bounds.height > 0 ? usableHeight / bounds.height : Number.POSITIVE_INFINITY,
    ),
  );

  const center = bounds.center;
  return {
    scale,
    tx: width / 2 - center.x * scale,
    ty: height / 2 + center.y * scale,
  };
}

/** Zooms by `factor` while keeping the world point under (px, py) pinned to that pixel. */
export function zoomAt(
  view: ViewTransform,
  px: number,
  py: number,
  factor: number,
): ViewTransform {
  const scale = clampScale(view.scale * factor);
  if (scale === view.scale) return view;

  const [worldX, worldY] = toWorld(view, px, py);
  return { scale, tx: px - worldX * scale, ty: py + worldY * scale };
}

export function pan(view: ViewTransform, dx: number, dy: number): ViewTransform {
  return { scale: view.scale, tx: view.tx + dx, ty: view.ty + dy };
}

export function toWorld(view: ViewTransform, px: number, py: number): [x: number, y: number] {
  return [(px - view.tx) / view.scale, -(py - view.ty) / view.scale];
}

export function toScreen(view: ViewTransform, x: number, y: number): [px: number, py: number] {
  return [x * view.scale + view.tx, -y * view.scale + view.ty];
}

function clampScale(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
