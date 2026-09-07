import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  DOCUMENT,
  Injectable,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ANALYTICS_HOST, CONSENT_KEY, EVENT, MEASUREMENT_ID, isEnabled } from './analytics.config';

export type ConsentChoice = 'granted' | 'denied';

interface GtagWindow extends Window {
  dataLayer?: IArguments[];
  gtag?: (...args: unknown[]) => void;
}

/**
 * GA4 behind Consent Mode v2.
 *
 * The tag is appended here rather than pasted into index.html. Google's snippet
 * sets cookies before a visitor has agreed to anything, and its config call
 * fires an automatic page view that would double-count against the one this
 * service sends on NavigationEnd. Keeping it in one file also means the
 * ordering below is testable.
 *
 * isEnabled gates the tag, not the consent state. The banner is live in any
 * browser, including localhost, so it can be developed without deploying.
 */
@Injectable({ providedIn: 'root' })
export class Analytics {
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly host = inject(ANALYTICS_HOST);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  private enabled = false;
  private readonly sentOnce = new Set<string>();

  /** null until the visitor has answered the banner. */
  readonly choice = signal<ConsentChoice | null>(null);
  readonly bannerVisible = signal(false);

  init(): void {
    if (!this.isBrowser) return;

    this.choice.set(this.readChoice());
    this.enabled = isEnabled(this.isBrowser, this.host);

    if (this.enabled) {
      this.bootstrapTag();
      this.watchNavigation();
      this.watchDownloads();
    }

    // After hydration, never during it. The prerendered HTML carries no banner,
    // so rendering one in the same pass would be a hydration mismatch.
    afterNextRender(() => this.bannerVisible.set(this.choice() === null), {
      injector: this.injector,
    });
  }

  accept(): void {
    this.setChoice('granted');
    // Only analytics storage. The site runs no ads, so asking for the ad
    // signals would be a claim it cannot justify.
    if (this.enabled) this.gtag('consent', 'update', { analytics_storage: 'granted' });
  }

  decline(): void {
    this.setChoice('denied');
  }

  /** Drives the footer's Cookies link. Withdrawal has to be as easy as granting. */
  reopen(): void {
    this.bannerVisible.set(true);
  }

  track(name: string, params: Record<string, unknown> = {}): void {
    if (!this.enabled) return;
    this.gtag('event', name, params);
  }

  /**
   * For events that should count a page view rather than a gesture. The set is
   * cleared on each navigation, so this is once per view and not once per
   * session. It lives here rather than as a flag on the calling component
   * because here it can be unit tested without rendering anything.
   */
  trackOnce(name: string, params: Record<string, unknown> = {}): void {
    if (!this.enabled || this.sentOnce.has(name)) return;
    this.sentOnce.add(name);
    this.track(name, params);
  }

  private setChoice(choice: ConsentChoice): void {
    this.choice.set(choice);
    this.bannerVisible.set(false);
    // Storage throws in Safari private mode and in blocked third-party
    // contexts. A failed write must not stop the choice applying to this page.
    try {
      this.doc.defaultView?.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      /* the choice still holds for this page view */
    }
  }

  private readChoice(): ConsentChoice | null {
    try {
      const stored = this.doc.defaultView?.localStorage.getItem(CONSENT_KEY) ?? null;
      return stored === 'granted' || stored === 'denied' ? stored : null;
    } catch {
      return null;
    }
  }

  private bootstrapTag(): void {
    const win = this.doc.defaultView as GtagWindow | null;
    if (!win) return;

    win.dataLayer = win.dataLayer ?? [];
    if (!win.gtag) {
      // Google's own shim, and it has to stay this shape: gtag.js reads the
      // pushed value as an arguments object, so pushing a plain array is not
      // equivalent. An arrow function has no arguments, hence the expression.
      win.gtag = function gtag() {
        win.dataLayer?.push(arguments);
      };
    }

    this.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    // A grant from a previous visit is applied before the script exists, so a
    // returning visitor is never briefly denied.
    if (this.choice() === 'granted') {
      this.gtag('consent', 'update', { analytics_storage: 'granted' });
    }

    const script = this.doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    this.doc.head.appendChild(script);

    this.gtag('js', new Date());
    this.gtag('config', MEASUREMENT_ID, { send_page_view: false });
  }

  /**
   * One delegated listener rather than markup on the anchor, so the about page
   * carries no analytics concerns. Matching on the extension survives the CV
   * file being renamed, which has already happened once.
   *
   * This is a custom name rather than GA4's file_download because it is the
   * closest thing this site has to a conversion and deserves its own row.
   * Enhanced Measurement's file download tracking is turned off in the property
   * so this is not counted twice under two names.
   */
  private watchDownloads(): void {
    this.doc.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a');
      const href = anchor?.getAttribute('href') ?? '';
      if (!href.toLowerCase().endsWith('.pdf')) return;

      this.track(EVENT.cvDownload, { file_name: href.split('/').pop() ?? href });
    });
  }

  /**
   * Router is pulled from the injector here rather than injected in the
   * constructor on purpose. The banner component's spec and the directive's
   * spec both inject this service into a TestBed that configures no router, and
   * a constructor injection would make them fail on a dependency they have no
   * reason to care about. This runs only when enabled, which is never in a spec
   * that has not asked for it.
   */
  private watchNavigation(): void {
    const router = this.injector.get(Router);
    const subscription = router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        // A new page, so once-per-view events may fire again. Synchronous,
        // unlike the send below, because it must happen before anything on the
        // new page has had a chance to call trackOnce.
        this.sentOnce.clear();
        this.schedulePageView(event.urlAfterRedirects);
      });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  /**
   * One render later, not now. home and about call Seo.set in their
   * constructors, so their titles are already correct here. writing-post and
   * project-detail call it inside a computed that only evaluates when the
   * template reads it, which is the render after this event. Sending
   * synchronously would stamp the previous page's title onto every post and
   * case study, which is the traffic this exists to measure.
   */
  private schedulePageView(url: string): void {
    afterNextRender(() => this.sendPageView(url), { injector: this.injector });
  }

  /**
   * The URL comes from the router rather than from window.location. The router
   * has already resolved redirects by this point, and its value does not depend
   * on the History API having been flushed, which is what makes this checkable
   * under RouterTestingHarness.
   */
  private sendPageView(url: string): void {
    const origin = this.doc.defaultView?.location.origin ?? '';
    this.gtag('event', 'page_view', {
      page_location: `${origin}${url}`,
      page_path: url.split(/[?#]/)[0],
      page_title: this.doc.title,
    });
  }

  private gtag(...args: unknown[]): void {
    (this.doc.defaultView as GtagWindow | null)?.gtag?.(...args);
  }
}
