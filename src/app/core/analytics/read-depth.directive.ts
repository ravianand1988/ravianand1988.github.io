import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { Analytics } from './analytics';
import { EVENT } from './analytics.config';

/**
 * Fires once when its host element scrolls into view. Put it on a zero-height
 * sentinel after the last paragraph of an article.
 *
 * GA4's built-in scroll event fires at 90% of the whole document, which on
 * these pages includes the rail and the footer, so it would overcount. This
 * measures the article.
 */
@Directive({ selector: '[appReadDepth]' })
export class ReadDepthDirective {
  /** The slug of the piece being read. */
  readonly appReadDepth = input.required<string>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly analytics = inject(Analytics);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Browser only. The pages are prerendered in Node, where there is nothing
    // to scroll and no observer to construct.
    afterNextRender(() => this.observe());
  }

  private observe(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      // trackOnce, not track: once per page view is a property of the service,
      // so this does not depend on the observer's disconnect having taken
      // effect before another entry is delivered.
      this.analytics.trackOnce(EVENT.readComplete, { slug: this.appReadDepth() });
      observer.disconnect();
    });

    observer.observe(this.element.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
