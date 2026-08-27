import { Component, computed, inject } from '@angular/core';
import { ThemeService, ThemePreference } from '../../core/theme';

const LABEL: Record<ThemePreference, string> = {
  system: 'Theme: follows your system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

const SHORT: Record<ThemePreference, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

/**
 * One button that cycles the three states rather than three radio inputs. The
 * control says what it currently is, and the accessible name says what it is
 * plus what pressing it does, because the visible text alone would leave a
 * screen-reader user guessing at the cycle order.
 */
@Component({
  selector: 'app-theme-toggle',
  template: `
    <!--
      State goes on the button rather than being read from :root. Component
      styles are selector-scoped, so a rule anchored on :root would be rewritten
      to :root[_ngcontent-x] and never match.
    -->
    <button
      type="button"
      class="toggle"
      [attr.data-state]="theme.preference()"
      [attr.aria-label]="label()"
      (click)="theme.cycle()"
    >
      <span class="dot" aria-hidden="true"></span>
      <span class="text">{{ short() }}</span>
    </button>
  `,
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);

  readonly short = computed(() => SHORT[this.theme.preference()]);
  readonly label = computed(() => `${LABEL[this.theme.preference()]}. Press to change.`);
}
