import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  Aperture,
  ApertureType,
  GerberElementType,
  convertLength,
  formatNumber,
  unitSuffix,
} from '../core';
import { GerberStore } from '../gerber-store';

type Tab = 'summary' | 'apertures' | 'warnings' | 'metadata';

/** One aperture row, with its macro already resolved (or the reason it could not be). */
interface ApertureRow {
  readonly code: number;
  readonly kind: string;
  readonly size: string;
  /** Shape-specific extras (diameter, side count, hole), already joined for display. */
  readonly note: string | null;
  readonly flashes: number;
  readonly draws: number;
  readonly error: string | null;
}

@Component({
  selector: 'app-info-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './info-panel.html',
  styleUrl: './info-panel.scss',
})
export class InfoPanel {
  protected readonly store = inject(GerberStore);
  protected readonly tab = signal<Tab>('summary');

  protected readonly summary = computed(() => {
    const data = this.store.data();
    if (data === null) return null;

    const unit = this.store.displayUnit();
    const bounds = data.boundingBox;
    const length = (value: number) => this.length(value);

    return {
      unit: data.unit,
      format: data.format.toString(),
      elements: data.elements.length,
      flashes: data.flashCount,
      draws: data.drawCount,
      apertures: data.apertures.size,
      macros: data.macros.size,
      extent: bounds.isEmpty
        ? '-'
        : `${length(bounds.width)} × ${length(bounds.height)} ${unitSuffix(unit)}`,
      x: bounds.isEmpty ? '-' : `${length(bounds.minX)} … ${length(bounds.maxX)}`,
      y: bounds.isEmpty ? '-' : `${length(bounds.minY)} … ${length(bounds.maxY)}`,
    };
  });

  protected readonly apertureRows = computed<readonly ApertureRow[]>(() => {
    const data = this.store.data();
    if (data === null) return [];

    const flashes = new Map<number, number>();
    const draws = new Map<number, number>();
    for (const element of data.elements) {
      const target = element.type === GerberElementType.Flash ? flashes : draws;
      target.set(element.apertureCode, (target.get(element.apertureCode) ?? 0) + 1);
    }

    return this.store.apertures().map((aperture) => this.toRow(aperture, flashes, draws));
  });

  protected readonly warningCount = computed(() => this.store.warnings().length);

  protected readonly unitSuffix = computed(() => unitSuffix(this.store.displayUnit()));

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected toggleHighlight(code: number): void {
    this.store.toggleHighlight(code);
  }

  /** Converts a length from the file's units into the unit the user picked. */
  private length(value: number, decimals = 4): string {
    const data = this.store.data();
    if (data === null) return formatNumber(value, decimals);

    return formatNumber(convertLength(value, data.unit, this.store.displayUnit()), decimals);
  }

  private toRow(
    aperture: Aperture,
    flashes: ReadonlyMap<number, number>,
    draws: ReadonlyMap<number, number>,
  ): ApertureRow {
    const counts = {
      flashes: flashes.get(aperture.code) ?? 0,
      draws: draws.get(aperture.code) ?? 0,
    };

    const hole =
      aperture.holeDiameter > 0 ? `⌀${this.length(aperture.holeDiameter)} hole` : null;

    try {
      return {
        code: aperture.code,
        kind: aperture.type === ApertureType.Macro ? (aperture.macroName ?? 'Macro') : aperture.type,
        size: `${this.length(aperture.halfWidth * 2)} × ${this.length(aperture.halfHeight * 2)}`,
        note: join(this.detail(aperture), hole),
        error: null,
        ...counts,
      };
    } catch (cause) {
      // A macro with an unsupported primitive only fails when it is evaluated.
      return {
        code: aperture.code,
        kind: aperture.macroName ?? aperture.type,
        size: '-',
        note: hole,
        error: cause instanceof Error ? cause.message : String(cause),
        ...counts,
      };
    }
  }

  private detail(aperture: Aperture): string | null {
    switch (aperture.type) {
      case ApertureType.Circle:
        return `⌀${this.length(aperture.diameter)}`;

      case ApertureType.Polygon:
        return `${aperture.vertexCount} sides, ${formatNumber(aperture.rotation, 3)}°`;

      case ApertureType.Macro:
        return `${aperture.macroShapes.length} shape(s)`;

      default:
        return null;
    }
  }
}

function join(...parts: (string | null)[]): string | null {
  const present = parts.filter((part): part is string => part !== null && part.length > 0);
  return present.length > 0 ? present.join(', ') : null;
}
