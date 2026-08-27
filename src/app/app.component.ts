import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';
import { SiteFooterComponent } from './layout/site-footer/site-footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  // The skip link is the first focusable thing on every page. The target is the
  // router outlet's wrapper rather than a page-owned element, so it keeps
  // working without every page having to remember to provide an anchor.
  //
  // routerLink, not href="#main": <base href="/"> makes a relative fragment
  // resolve against the site root, so a bare href sent the first tab stop on
  // every page to the homepage.
  template: `
    <a class="skip-link" [routerLink]="[]" fragment="main">Skip to content</a>
    <app-site-header />
    <div id="main" tabindex="-1">
      <router-outlet />
    </div>
    <app-site-footer />
  `,
})
export class AppComponent {}
