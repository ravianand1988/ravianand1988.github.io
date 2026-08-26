import {
  Aperture,
  ApertureType,
  GerberData,
  GerberElement,
  GerberElementType,
  Polarity,
} from '../core';
import {
  ApertureFigure,
  Point,
  apertureFigures,
  apertureOutline,
  convexHull,
  hasClearFigures,
} from './aperture-geometry';
import { ViewTransform } from './viewport';

export interface RenderTheme {
  readonly background: string;
  readonly copper: string;
  readonly highlight: string;
  readonly outline: string;
  readonly origin: string;
}

export interface RenderOptions {
  readonly view: ViewTransform;
  /** Viewport size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly theme: RenderTheme;
  readonly showBounds: boolean;
  readonly showOrigin: boolean;
  /** Repaints the flashes of one aperture in the highlight colour. */
  readonly highlightApertureCode: number | null;
}

export interface RenderResult {
  /** Elements skipped because the file selected a D-code it never defined. */
  readonly skippedElements: number;
  /** Set when a macro aperture could not be evaluated; the rest of the layer still drew. */
  readonly error: string | null;
}

/**
 * Draws a parsed layer onto a 2D canvas.
 *
 * Copper goes onto a transparent scratch layer first so that clear (LPC) elements and aperture
 * holes can be punched out with `destination-out` without eating into the background. Macros that
 * mix exposure-on and exposure-off primitives get a second isolated layer, because an "off"
 * primitive is only allowed to clear its own aperture, not what was drawn earlier.
 */
export class GerberRenderer {
  private layer: HTMLCanvasElement | null = null;
  private isolation: HTMLCanvasElement | null = null;

  render(canvas: HTMLCanvasElement, data: GerberData | null, options: RenderOptions): RenderResult {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return { skippedElements: 0, error: 'This browser has no 2D canvas context.' };

    const dpr = options.devicePixelRatio;
    const pixelWidth = Math.max(1, Math.round(options.width * dpr));
    const pixelHeight = Math.max(1, Math.round(options.height * dpr));

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = options.theme.background;
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);

    if (data === null) return { skippedElements: 0, error: null };

    const layerCtx = this.prepareLayer('layer', pixelWidth, pixelHeight);
    if (layerCtx === null)
      return { skippedElements: 0, error: 'This browser has no 2D canvas context.' };

    applyWorldTransform(layerCtx, options);
    layerCtx.fillStyle = options.theme.copper;
    layerCtx.strokeStyle = options.theme.copper;

    let skipped = 0;
    let error: string | null = null;

    for (const element of data.elements) {
      const aperture = data.getAperture(element);
      if (aperture === null) {
        skipped++;
        continue;
      }

      try {
        this.paintElement(layerCtx, aperture, element, options, pixelWidth, pixelHeight);
      } catch (cause) {
        skipped++;
        error ??= cause instanceof Error ? cause.message : String(cause);
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.layer!, 0, 0);

    this.paintHighlight(ctx, data, options);
    this.paintGuides(ctx, data, options);

    return { skippedElements: skipped, error };
  }

  // ---------------------------------------------------------------- elements

  private paintElement(
    ctx: CanvasRenderingContext2D,
    aperture: Aperture,
    element: GerberElement,
    options: RenderOptions,
    pixelWidth: number,
    pixelHeight: number,
  ): void {
    const clear = element.polarity === Polarity.Clear;

    if (element.type === GerberElementType.Draw) {
      this.paintStroke(ctx, aperture, element, clear);
      return;
    }

    const figures = apertureFigures(aperture);
    const hole = aperture.holeDiameter;
    const at: Point = [element.end.x, element.end.y];

    // The common case: an all-additive aperture flashed dark. Paint straight onto the layer.
    if (!clear && !hasClearFigures(figures)) {
      ctx.globalCompositeOperation = 'source-over';
      for (const figure of figures) ctx.fill(figurePath(figure, at));
      if (hole > 0) punch(ctx, circlePath(at, hole / 2));
      return;
    }

    // Otherwise resolve the aperture on its own layer, then composite the result in one go.
    const isolation = this.prepareLayer('isolation', pixelWidth, pixelHeight);
    if (isolation === null) return;

    const device = deviceRect(aperture, element, options, pixelWidth, pixelHeight);
    if (device === null) return;

    isolation.setTransform(1, 0, 0, 1, 0, 0);
    isolation.clearRect(device.x, device.y, device.width, device.height);
    applyWorldTransform(isolation, options);
    isolation.fillStyle = options.theme.copper;

    for (const figure of figures) {
      isolation.globalCompositeOperation = figure.exposure ? 'source-over' : 'destination-out';
      isolation.fill(figurePath(figure, at));
    }

    if (hole > 0) punch(isolation, circlePath(at, hole / 2));
    isolation.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = clear ? 'destination-out' : 'source-over';
    ctx.drawImage(
      this.isolation!,
      device.x,
      device.y,
      device.width,
      device.height,
      device.x,
      device.y,
      device.width,
      device.height,
    );
    ctx.restore();
  }

  private paintStroke(
    ctx: CanvasRenderingContext2D,
    aperture: Aperture,
    element: GerberElement,
    clear: boolean,
  ): void {
    ctx.globalCompositeOperation = clear ? 'destination-out' : 'source-over';

    // A round aperture sweeps into a stadium, which a round-capped stroke draws exactly.
    if (aperture.type === ApertureType.Circle && aperture.holeDiameter === 0) {
      ctx.save();
      ctx.lineWidth = Math.max(aperture.diameter, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(element.start.x, element.start.y);
      ctx.lineTo(element.end.x, element.end.y);
      ctx.stroke();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    // Everything else sweeps as the hull of the aperture outline at both endpoints.
    const outline = apertureOutline(aperture);
    if (outline.length === 0) {
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    const swept: Point[] = [];
    for (const [x, y] of outline) {
      swept.push([element.start.x + x, element.start.y + y]);
      swept.push([element.end.x + x, element.end.y + y]);
    }

    ctx.fill(polygonPath(convexHull(swept)));
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- overlays

  private paintHighlight(
    ctx: CanvasRenderingContext2D,
    data: GerberData,
    options: RenderOptions,
  ): void {
    const code = options.highlightApertureCode;
    if (code === null) return;

    const aperture = data.apertures.get(code);
    if (!aperture) return;

    applyWorldTransform(ctx, options);
    ctx.fillStyle = options.theme.highlight;
    ctx.strokeStyle = options.theme.highlight;
    ctx.globalCompositeOperation = 'source-over';

    for (const element of data.elements) {
      if (element.apertureCode !== code) continue;

      try {
        // Highlights are a flat overlay, so they ignore clear polarity on purpose.
        if (element.type === GerberElementType.Draw) {
          this.paintStroke(ctx, aperture, element, false);
        } else {
          const at: Point = [element.end.x, element.end.y];
          for (const figure of apertureFigures(aperture)) {
            if (figure.exposure) ctx.fill(figurePath(figure, at));
          }
        }
      } catch {
        return;
      }
    }
  }

  private paintGuides(
    ctx: CanvasRenderingContext2D,
    data: GerberData,
    options: RenderOptions,
  ): void {
    const { theme, view } = options;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1;

    if (options.showBounds && !data.boundingBox.isEmpty) {
      const bounds = data.boundingBox;
      const left = bounds.minX * view.scale + view.tx;
      const right = bounds.maxX * view.scale + view.tx;
      const top = -bounds.maxY * view.scale + view.ty;
      const bottom = -bounds.minY * view.scale + view.ty;

      ctx.save();
      ctx.strokeStyle = theme.outline;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top);
      ctx.restore();
    }

    if (options.showOrigin) {
      const x = view.tx;
      const y = view.ty;
      ctx.save();
      ctx.strokeStyle = theme.origin;
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.lineTo(x + 9, y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x, y + 9);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- scratch layers

  private prepareLayer(
    which: 'layer' | 'isolation',
    pixelWidth: number,
    pixelHeight: number,
  ): CanvasRenderingContext2D | null {
    let canvas = which === 'layer' ? this.layer : this.isolation;
    if (canvas === null) {
      canvas = document.createElement('canvas');
      if (which === 'layer') this.layer = canvas;
      else this.isolation = canvas;
    }

    const resized = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
    if (resized) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext('2d');
    if (ctx === null) return null;

    if (which === 'layer') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    } else if (resized) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    }

    return ctx;
  }
}

// ---------------------------------------------------------------- paths and transforms

function applyWorldTransform(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { view, devicePixelRatio: dpr } = options;
  ctx.setTransform(
    view.scale * dpr,
    0,
    0,
    -view.scale * dpr,
    view.tx * dpr,
    view.ty * dpr,
  );
}

function punch(ctx: CanvasRenderingContext2D, path: Path2D): void {
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(path);
  ctx.globalCompositeOperation = previous;
}

export function figurePath(figure: ApertureFigure, at: Point): Path2D {
  const [ox, oy] = at;
  switch (figure.kind) {
    case 'circle':
      return circlePath([ox + figure.center[0], oy + figure.center[1]], figure.radius);

    case 'polygon':
      return polygonPath(figure.points.map(([x, y]) => [ox + x, oy + y] as Point));

    case 'stadium':
      return stadiumPath(
        [ox + figure.center[0], oy + figure.center[1]],
        figure.width,
        figure.height,
      );
  }
}

function circlePath(center: Point, radius: number): Path2D {
  const path = new Path2D();
  if (radius > 0) path.arc(center[0], center[1], radius, 0, 2 * Math.PI);
  return path;
}

function polygonPath(points: readonly Point[]): Path2D {
  const path = new Path2D();
  if (points.length === 0) return path;

  path.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i][0], points[i][1]);
  path.closePath();
  return path;
}

/** A rectangle with fully rounded short ends; degenerates to a circle when width === height. */
function stadiumPath(center: Point, width: number, height: number): Path2D {
  const path = new Path2D();
  const radius = Math.min(width, height) / 2;
  if (radius <= 0) return path;

  const [cx, cy] = center;
  const right = cx + Math.max(width / 2 - radius, 0);
  const left = cx - Math.max(width / 2 - radius, 0);
  const top = cy + Math.max(height / 2 - radius, 0);
  const bottom = cy - Math.max(height / 2 - radius, 0);

  path.arc(right, bottom, radius, -Math.PI / 2, 0);
  path.arc(right, top, radius, 0, Math.PI / 2);
  path.arc(left, top, radius, Math.PI / 2, Math.PI);
  path.arc(left, bottom, radius, Math.PI, 1.5 * Math.PI);
  path.closePath();
  return path;
}

interface DeviceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Device-pixel box an element covers, clamped to the canvas, with a pixel of slack for antialiasing. */
function deviceRect(
  aperture: Aperture,
  element: GerberElement,
  options: RenderOptions,
  pixelWidth: number,
  pixelHeight: number,
): DeviceRect | null {
  const { view, devicePixelRatio: dpr } = options;
  const halfWidth = aperture.halfWidth;
  const halfHeight = aperture.halfHeight;

  const minX = Math.min(element.start.x, element.end.x) - halfWidth;
  const maxX = Math.max(element.start.x, element.end.x) + halfWidth;
  const minY = Math.min(element.start.y, element.end.y) - halfHeight;
  const maxY = Math.max(element.start.y, element.end.y) + halfHeight;

  const left = Math.floor((minX * view.scale + view.tx) * dpr) - 2;
  const right = Math.ceil((maxX * view.scale + view.tx) * dpr) + 2;
  const top = Math.floor((-maxY * view.scale + view.ty) * dpr) - 2;
  const bottom = Math.ceil((-minY * view.scale + view.ty) * dpr) + 2;

  const x = Math.max(0, left);
  const y = Math.max(0, top);
  const width = Math.min(pixelWidth, right) - x;
  const height = Math.min(pixelHeight, bottom) - y;

  return width > 0 && height > 0 ? { x, y, width, height } : null;
}
