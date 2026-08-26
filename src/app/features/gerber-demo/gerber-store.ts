import { Injectable, computed, signal } from '@angular/core';
import { Aperture, GerberData, GerberParser, GerberUnit } from './core';

/** Path the bundled Altium sample is served from (copied by the assets glob). */
export const SAMPLE_URL = '/assets/samples/PCB1.GBP';

/**
 * The single source of truth for the loaded layer. Everything the UI shows is derived from
 * `data`, so loading a new file is one assignment.
 */
@Injectable({ providedIn: 'root' })
export class GerberStore {
  private readonly _data = signal<GerberData | null>(null);
  private readonly _fileName = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _displayUnit = signal<GerberUnit>(GerberUnit.Millimeters);
  private readonly _highlightApertureCode = signal<number | null>(null);

  readonly data = this._data.asReadonly();
  readonly fileName = this._fileName.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly displayUnit = this._displayUnit.asReadonly();
  readonly highlightApertureCode = this._highlightApertureCode.asReadonly();

  readonly hasData = computed(() => this._data() !== null);

  /** Aperture dictionary as a stable, D-code-ordered list for the side panel. */
  readonly apertures = computed<readonly Aperture[]>(() => {
    const data = this._data();
    if (data === null) return [];

    return [...data.apertures.values()].sort((a, b) => a.code - b.code);
  });

  readonly warnings = computed<readonly string[]>(() => this._data()?.warnings ?? []);

  readonly attributes = computed<readonly { key: string; value: string }[]>(() => {
    const data = this._data();
    if (data === null) return [];

    return [...data.attributes.entries()].map(([key, value]) => ({ key, value }));
  });

  async loadFile(file: File): Promise<void> {
    this._loading.set(true);
    try {
      this.accept(GerberParser.parse(await file.text(), file.name));
    } catch (cause) {
      this.reject(cause, file.name);
    } finally {
      this._loading.set(false);
    }
  }

  /** Loads the Altium paste layer that ships with the repository. */
  async loadSample(url = SAMPLE_URL): Promise<void> {
    this._loading.set(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

      this.accept(GerberParser.parse(await response.text(), 'PCB1.GBP'));
    } catch (cause) {
      this.reject(cause, 'PCB1.GBP');
    } finally {
      this._loading.set(false);
    }
  }

  loadText(content: string, fileName: string): void {
    try {
      this.accept(GerberParser.parse(content, fileName));
    } catch (cause) {
      this.reject(cause, fileName);
    }
  }

  clear(): void {
    this._data.set(null);
    this._fileName.set(null);
    this._error.set(null);
    this._highlightApertureCode.set(null);
  }

  setDisplayUnit(unit: GerberUnit): void {
    this._displayUnit.set(unit);
  }

  /** Clicking the already-highlighted aperture clears the highlight. */
  toggleHighlight(code: number): void {
    this._highlightApertureCode.update((current) => (current === code ? null : code));
  }

  clearHighlight(): void {
    this._highlightApertureCode.set(null);
  }

  private accept(data: GerberData): void {
    this._data.set(data);
    this._fileName.set(data.fileName);
    this._error.set(null);
    this._displayUnit.set(data.unit);
    this._highlightApertureCode.set(null);
  }

  private reject(cause: unknown, fileName: string): void {
    this._data.set(null);
    this._fileName.set(fileName);
    this._highlightApertureCode.set(null);
    this._error.set(cause instanceof Error ? cause.message : String(cause));
  }
}
