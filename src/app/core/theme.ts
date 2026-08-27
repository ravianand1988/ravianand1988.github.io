import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const ORDER: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Theme preference, persisted.
 *
 * The site is prerendered, so this runs twice: once in Node with no window and
 * no localStorage, and again in the browser. Every platform-specific read is
 * therefore guarded, and the server always resolves to 'system', which is what
 * the prerendered HTML should say. The browser then corrects it on hydration.
 *
 * 'system' deliberately writes no attribute at all rather than writing the
 * resolved value, so the CSS media query stays in charge and the page keeps
 * following the OS if the visitor changes it while the tab is open.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly preference = signal<ThemePreference>(this.read());

  constructor() {
    effect(() => this.apply(this.preference()));
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    // Storage can throw: Safari in private mode, or a blocked third-party
    // context. A failed write must not stop the theme from changing.
    try {
      this.doc.defaultView?.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* preference is still applied for this page view */
    }
  }

  /** Cycles system to light to dark and back. Drives the single-button toggle. */
  cycle(): void {
    const next = ORDER[(ORDER.indexOf(this.preference()) + 1) % ORDER.length];
    this.set(next);
  }

  private read(): ThemePreference {
    try {
      const stored = this.doc.defaultView?.localStorage.getItem(STORAGE_KEY) ?? null;
      return isPreference(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private apply(preference: ThemePreference): void {
    const root = this.doc.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }
}
