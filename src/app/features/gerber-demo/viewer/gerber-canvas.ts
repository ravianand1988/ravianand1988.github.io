import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GerberData } from '../core';
import { GerberRenderer, RenderTheme } from '../render/gerber-renderer';
import {
  IDENTITY_VIEW,
  ViewTransform,
  fitToBounds,
  pan,
  toWorld,
  zoomAt,
} from '../render/viewport';

const THEME: RenderTheme = {
  background: '#0d1117',
  copper: '#e5b567',
  highlight: '#5ac8fa',
  outline: '#3d4653',
  origin: '#546074',
};

const WHEEL_ZOOM_STEP = 1.0015;
const BUTTON_ZOOM_STEP = 1.35;

/** World-space cursor position, in the file's own units. */
export interface CursorPosition {
  readonly x: number;
  readonly y: number;
}

@Component({
  selector: 'app-gerber-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gerber-canvas.html',
  styleUrl: './gerber-canvas.scss',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'onPointerUp($event)',
    '(pointerleave)': 'onPointerLeave()',
    '(wheel)': 'onWheel($event)',
    '(dblclick)': 'fit()',
    '[class.is-panning]': 'panning()',
  },
})
export class GerberCanvas implements OnDestroy {
  readonly data = input<GerberData | null>(null);
  readonly highlightApertureCode = input<number | null>(null);
  readonly showBounds = input(true);
  readonly showOrigin = input(true);

  readonly cursorMoved = output<CursorPosition | null>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly renderer = new GerberRenderer();
  private readonly view = signal<ViewTransform>(IDENTITY_VIEW);
  private readonly size = signal<{ width: number; height: number }>({ width: 0, height: 0 });
  private readonly dpr = signal(1);

  protected readonly panning = signal(false);
  protected readonly renderError = signal<string | null>(null);
  protected readonly skippedElements = signal(0);

  protected readonly scaleLabel = computed(() => {
    const scale = this.view().scale;
    return scale >= 10 ? scale.toFixed(0) : scale.toFixed(1);
  });

  private resizeObserver: ResizeObserver | null = null;
  private pointerId: number | null = null;
  private lastPointer: { x: number; y: number } | null = null;
  /** The layer the view was last auto-fitted to, so a resize does not undo the user's pan. */
  private fittedTo: GerberData | null = null;

  constructor(private readonly host: ElementRef<HTMLElement>) {
    // A single effect drives every repaint: it reads the inputs and the view signals.
    effect(() => {
      const data = this.data();
      const { width, height } = this.size();
      const dpr = this.dpr();
      const highlight = this.highlightApertureCode();
      const showBounds = this.showBounds();
      const showOrigin = this.showOrigin();

      if (width === 0 || height === 0) return;

      if (data !== this.fittedTo) {
        this.fittedTo = data;
        if (data !== null) {
          this.view.set(fitToBounds(data.boundingBox, width, height));
        }
      }

      const result = this.renderer.render(this.canvasRef().nativeElement, data, {
        view: this.view(),
        width,
        height,
        devicePixelRatio: dpr,
        theme: THEME,
        showBounds,
        showOrigin,
        highlightApertureCode: highlight,
      });

      this.renderError.set(result.error);
      this.skippedElements.set(result.skippedElements);
    });

    afterNextRender(() => this.observeSize());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  // ---------------------------------------------------------------- public controls

  fit(): void {
    const data = this.data();
    const { width, height } = this.size();
    if (data === null || width === 0) return;

    this.view.set(fitToBounds(data.boundingBox, width, height));
  }

  zoomIn(): void {
    this.zoomAtCenter(BUTTON_ZOOM_STEP);
  }

  zoomOut(): void {
    this.zoomAtCenter(1 / BUTTON_ZOOM_STEP);
  }

  // ---------------------------------------------------------------- pointer handling

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.button !== 1) return;

    this.pointerId = event.pointerId;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.panning.set(true);
    this.host.nativeElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  protected onPointerMove(event: PointerEvent): void {
    const [x, y] = this.localPoint(event);
    this.cursorMoved.emit(this.toWorldPosition(x, y));

    if (this.pointerId !== event.pointerId || this.lastPointer === null) return;

    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.view.update((view) => pan(view, dx, dy));
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;

    if (this.host.nativeElement.hasPointerCapture(event.pointerId))
      this.host.nativeElement.releasePointerCapture(event.pointerId);

    this.pointerId = null;
    this.lastPointer = null;
    this.panning.set(false);
  }

  protected onPointerLeave(): void {
    this.cursorMoved.emit(null);
  }

  protected onWheel(event: WheelEvent): void {
    if (this.data() === null) return;

    event.preventDefault();
    const [x, y] = this.localPoint(event);

    // deltaMode 1 is lines, 2 is pages; normalise both to something pixel-ish.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1;
    const factor = Math.pow(WHEEL_ZOOM_STEP, -event.deltaY * unit);

    this.view.update((view) => zoomAt(view, x, y, factor));
    this.cursorMoved.emit(this.toWorldPosition(x, y));
  }

  // ---------------------------------------------------------------- internals

  private zoomAtCenter(factor: number): void {
    const { width, height } = this.size();
    if (width === 0) return;

    this.view.update((view) => zoomAt(view, width / 2, height / 2, factor));
  }

  private toWorldPosition(x: number, y: number): CursorPosition | null {
    if (this.data() === null) return null;

    const [worldX, worldY] = toWorld(this.view(), x, y);
    return { x: worldX, y: worldY };
  }

  private localPoint(event: MouseEvent): [x: number, y: number] {
    const rect = this.host.nativeElement.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  private observeSize(): void {
    const element = this.host.nativeElement;
    this.dpr.set(window.devicePixelRatio || 1);

    this.resizeObserver = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      this.dpr.set(window.devicePixelRatio || 1);
      this.size.set({ width: Math.round(rect.width), height: Math.round(rect.height) });
    });

    this.resizeObserver.observe(element);

    const rect = element.getBoundingClientRect();
    this.size.set({ width: Math.round(rect.width), height: Math.round(rect.height) });
  }
}
