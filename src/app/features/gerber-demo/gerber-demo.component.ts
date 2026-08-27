import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  convertLength,
  CursorPosition,
  formatNumber,
  GerberCanvas,
  GerberInfoPanel,
  GerberStore,
  GerberUnit,
  unitSuffix,
} from 'ngx-gerber';

/** The Altium paste layer shipped in this site's assets. */
const SAMPLE_URL = '/assets/samples/PCB1.GBP';

/** Extensions the file picker suggests; any text file is accepted regardless. */
const GERBER_EXTENSIONS =
  '.gbr,.gbl,.gbo,.gbp,.gbs,.gtl,.gto,.gtp,.gts,.gm1,.gko,.g1,.g2,.g3,.ger,.art,.pho,.txt';

/**
 * The viewer embedded in the Gerber case study. The parser, renderer and canvas
 * come from the published ngx-gerber package, so this page consumes the same
 * thing a reader can install rather than a copy of it. What is left here is the
 * page-level shell: a toolbar, and loading the bundled sample on first render so
 * a visitor sees a board without having to find a Gerber file first.
 */
@Component({
  selector: 'app-gerber-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GerberCanvas, GerberInfoPanel],
  templateUrl: './gerber-demo.component.html',
  styleUrl: './gerber-demo.component.scss',
})
export class GerberDemoComponent {
  protected readonly store = inject(GerberStore);
  protected readonly accept = GERBER_EXTENSIONS;
  protected readonly GerberUnit = GerberUnit;

  private readonly canvas = viewChild.required(GerberCanvas);

  protected readonly showBounds = signal(true);
  protected readonly showOrigin = signal(true);
  protected readonly dragging = signal(false);
  private readonly cursor = signal<CursorPosition | null>(null);

  protected readonly unitSuffix = computed(() => unitSuffix(this.store.displayUnit()));

  /** Live cursor read-out, converted from the file's units into the displayed unit. */
  protected readonly cursorLabel = computed(() => {
    const position = this.cursor();
    const data = this.store.data();
    if (position === null || data === null) return null;

    const to = this.store.displayUnit();
    const decimals = to === GerberUnit.Inches ? 5 : 3;
    const x = formatNumber(convertLength(position.x, data.unit, to), decimals);
    const y = formatNumber(convertLength(position.y, data.unit, to), decimals);
    return `X ${x}   Y ${y}`;
  });

  constructor() {
    // Browser only. The page is prerendered at build time, where there is no
    // canvas to draw on and no server to fetch the sample from.
    afterNextRender(() => {
      if (!this.store.hasData()) void this.store.loadSample(SAMPLE_URL);
    });
  }

  protected reloadSample(): void {
    void this.store.loadSample(SAMPLE_URL);
  }

  protected async onFilePicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.store.loadFile(file);

    // Reset so re-picking the same file fires a change event again.
    input.value = '';
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) await this.store.loadFile(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    if (event.currentTarget === event.target) this.dragging.set(false);
  }

  protected onCursorMoved(position: CursorPosition | null): void {
    this.cursor.set(position);
  }

  protected setUnit(unit: GerberUnit): void {
    this.store.setDisplayUnit(unit);
  }

  protected fit(): void {
    this.canvas().fit();
  }

  protected zoomIn(): void {
    this.canvas().zoomIn();
  }

  protected zoomOut(): void {
    this.canvas().zoomOut();
  }
}
