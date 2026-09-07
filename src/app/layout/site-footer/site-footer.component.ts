import { Component, inject } from '@angular/core';
import { Analytics } from '../../core/analytics/analytics';

@Component({
  selector: 'app-site-footer',
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  protected readonly analytics = inject(Analytics);
}
