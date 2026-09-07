import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Analytics } from '../../core/analytics/analytics';

/**
 * The whole privacy disclosure, because the site has no privacy page. It is
 * rendered only after hydration, so it never appears in the prerendered HTML,
 * which could not know a visitor's choice anyway.
 */
@Component({
  selector: 'app-consent-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consent-banner.component.html',
  styleUrl: './consent-banner.component.scss',
})
export class ConsentBannerComponent {
  protected readonly analytics = inject(Analytics);
}
