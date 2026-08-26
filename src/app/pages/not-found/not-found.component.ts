import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <p class="eyebrow">404</p>
      <h1>That page is not here.</h1>
      <p><a routerLink="/">Back to the homepage</a></p>
    </main>
  `,
})
export class NotFoundComponent {}
