# GA4 Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GA4 to the site behind Google Consent Mode v2, denied by default, with a consent banner and four tracked interactions.

**Architecture:** One `Analytics` service in `src/app/core/analytics/` owns everything: it pushes a denied-by-default consent state onto `dataLayer`, appends `gtag.js` itself after bootstrap, configures GA with `send_page_view: false`, and sends every page view from the router's `NavigationEnd`. Nothing is added to `index.html`. A hostname guard means the tag only ever loads on the deployed site, so prerendering, `npm start` and Vitest never contact Google.

**Tech Stack:** Angular 21 standalone (zoneless), signals, RxJS for router events, Vitest with jsdom via `@angular/build:unit-test`, SCSS with the existing design tokens.

**Spec:** [docs/superpowers/specs/2026-09-07-ga4-analytics-design.md](../specs/2026-09-07-ga4-analytics-design.md)

## Global Constraints

- Measurement ID is exactly `G-D3ZCLSGYT8`. Production host is exactly `ravianand1988.github.io`.
- `localStorage` key is exactly `analytics-consent`, values `granted` or `denied`.
- Ad signals (`ad_storage`, `ad_user_data`, `ad_personalization`) are denied at default and are **never** updated to granted. Only `analytics_storage` is ever granted.
- Standalone components. Do **not** write `standalone: true`; it has been the default since Angular 19.
- Formatting from `.editorconfig`: 2-space indent, single quotes in TS, final newline, no trailing whitespace. There is no linter.
- **No em-dashes anywhere in user-visible copy.** `tools/verify-build.mjs` fails the build on one.
- Component SCSS uses `var(--token)` only, never hard-coded colours, and is budgeted at 2 kB warning / 4 kB error.
- Never edit `src/generated/`. It is build output.
- Do not change any employment date, job title, or claim. This work touches none of them.
- Commit message style follows the repo: an imperative sentence, not a `feat:` prefix. Every commit message ends with the trailer shown in Task 1, Step 6.
- Run a single spec file with:
  `npx ng test --no-watch --include src/app/path/to/file.spec.ts`

---

### Task 1: Config, the enable switch, and the host token

The one decision the whole design rests on, isolated as a pure function plus a DI token so every later test can flip it.

**Files:**
- Create: `src/app/core/analytics/analytics.config.ts`
- Create: `src/app/core/analytics/analytics.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MEASUREMENT_ID: string`, `PRODUCTION_HOST: string`, `CONSENT_KEY: string`, `EVENT` (a const object with `cvDownload`, `readComplete`, `gerberInteraction`), `isEnabled(isBrowser: boolean, hostname: string): boolean`, `ANALYTICS_HOST: InjectionToken<string>`.

- [ ] **Step 1: Write the failing test**

Create `src/app/core/analytics/analytics.spec.ts`:

```ts
import { isEnabled, PRODUCTION_HOST } from './analytics.config';

describe('isEnabled', () => {
  it('is false on the server, where there is no browser to measure', () => {
    expect(isEnabled(false, PRODUCTION_HOST)).toBe(false);
  });

  it('is false on localhost, so dev traffic never reaches the property', () => {
    expect(isEnabled(true, 'localhost')).toBe(false);
  });

  it('is false on any other host, including a preview deployment', () => {
    expect(isEnabled(true, 'ravianand1988.github.io.evil.test')).toBe(false);
  });

  it('is true only on the deployed site', () => {
    expect(isEnabled(true, PRODUCTION_HOST)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: FAIL, cannot resolve `./analytics.config`.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/core/analytics/analytics.config.ts`:

```ts
import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/**
 * The GA4 property this site reports to. Measurement IDs ship in the page source
 * of every site that uses GA4, so this is public by design and a build-time
 * secret would buy nothing.
 */
export const MEASUREMENT_ID = 'G-D3ZCLSGYT8';

/** Analytics runs on the deployed site and nowhere else. */
export const PRODUCTION_HOST = 'ravianand1988.github.io';

export const CONSENT_KEY = 'analytics-consent';

export const EVENT = {
  cvDownload: 'cv_download',
  readComplete: 'read_complete',
  gerberInteraction: 'gerber_interaction',
} as const;

/**
 * Whether the tag may load and events may be sent.
 *
 * Pure, and exported on its own, because jsdom makes location awkward to
 * override: the decision is worth testing directly rather than through the
 * service's environment. Note this gates the tag only. Consent state and the
 * banner stay live everywhere, so the banner can be developed on localhost.
 */
export function isEnabled(isBrowser: boolean, hostname: string): boolean {
  return isBrowser && hostname === PRODUCTION_HOST;
}

/**
 * The hostname the switch reads. A token rather than a direct location read so a
 * test can provide the production host without fighting jsdom.
 */
export const ANALYTICS_HOST = new InjectionToken<string>('analytics host', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView?.location.hostname ?? '',
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/analytics/
git commit -m "$(cat <<'MSG'
Add the analytics config and its enable switch

isEnabled is a pure function rather than a read inside the service because
jsdom makes location awkward to override, and this is the decision that keeps
prerendering, npm start and every spec from contacting Google.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

### Task 2: The Analytics service, consent and the tag

**Files:**
- Create: `src/app/core/analytics/analytics.ts`
- Modify: `src/app/core/analytics/analytics.spec.ts`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: `Analytics` service with `init(): void`, `accept(): void`, `decline(): void`, `reopen(): void`, `track(name: string, params?: Record<string, unknown>): void`, `trackOnce(name: string, params?: Record<string, unknown>): void`, and the readonly signals `choice: Signal<ConsentChoice | null>` and `bannerVisible: Signal<boolean>`. Also the type `ConsentChoice = 'granted' | 'denied'`.

**Two details that are easy to get wrong and are the reason this task exists:**

1. `dataLayer` entries must be pushed as the `arguments` object, exactly as Google's own snippet does with `function gtag(){dataLayer.push(arguments);}`. Pushing a plain array is not equivalent and GA will ignore the commands. That forces a `function` expression rather than an arrow, since arrows have no `arguments`.
2. The service must **not** inject `Router` in its constructor. The banner spec in Task 4 and the directive spec in Task 6 both inject `Analytics` into a TestBed that configures no router, and a constructor injection would make them fail on a dependency they have no reason to care about. The router is pulled from an `Injector` inside `watchNavigation()`, which only runs when enabled, so a router-less TestBed keeps working.

- [ ] **Step 1: Write the failing test**

Append to `src/app/core/analytics/analytics.spec.ts`:

```ts
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Analytics } from './analytics';
// Merge these into the import from './analytics.config' already at the top of
// the file from Task 1, rather than adding a second import of the same module.
import { ANALYTICS_HOST, CONSENT_KEY, MEASUREMENT_ID } from './analytics.config';

interface TestWindow extends Window {
  dataLayer?: IArguments[];
  gtag?: (...args: unknown[]) => void;
}

function layer(): unknown[][] {
  const entries = (window as TestWindow).dataLayer ?? [];
  return entries.map((entry) => Array.from(entry));
}

function commands(name: string): unknown[][] {
  return layer().filter((entry) => entry[0] === name);
}

function tagScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll('script')].filter((s) =>
    s.src.includes('googletagmanager.com'),
  );
}

describe('Analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as TestWindow).dataLayer;
    delete (window as TestWindow).gtag;
    for (const script of tagScripts()) script.remove();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    for (const script of tagScripts()) script.remove();
  });

  /** Enabled by default, because that is the interesting path. */
  function create(host = PRODUCTION_HOST, platform = 'browser'): Analytics {
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: host },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    const service = TestBed.inject(Analytics);
    service.init();
    return service;
  }

  it('denies all four signals by default', () => {
    create();
    expect(commands('consent')[0]).toEqual([
      'consent',
      'default',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
  });

  it('appends the tag and turns GA automatic page views off', () => {
    create();
    expect(tagScripts()).toHaveLength(1);
    expect(tagScripts()[0].src).toContain(MEASUREMENT_ID);
    expect(commands('config')[0]).toEqual([
      'config',
      MEASUREMENT_ID,
      { send_page_view: false },
    ]);
  });

  it('injects nothing and writes nothing when the host is not production', () => {
    create('localhost');
    expect(tagScripts()).toHaveLength(0);
    expect((window as TestWindow).dataLayer).toBeUndefined();
  });

  it('injects nothing on the server', () => {
    create(PRODUCTION_HOST, 'server');
    expect(tagScripts()).toHaveLength(0);
  });

  it('applies a stored grant before the tag is appended, not after', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    create();

    const consent = commands('consent');
    expect(consent[1]).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    // The update must precede the config command, which is pushed after the
    // script element is created. Otherwise a returning visitor is briefly denied.
    const updateIndex = layer().findIndex((entry) => entry[1] === 'update');
    const configIndex = layer().findIndex((entry) => entry[0] === 'config');
    expect(updateIndex).toBeLessThan(configIndex);
  });

  it('grants only analytics storage on accept, never the ad signals', () => {
    const service = create();
    service.accept();

    expect(commands('consent').at(-1)).toEqual([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ]);
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(service.choice()).toBe('granted');
  });

  it('stores the refusal and pushes no update on decline', () => {
    const service = create();
    const before = commands('consent').length;
    service.decline();

    expect(commands('consent')).toHaveLength(before);
    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(service.choice()).toBe('denied');
  });

  it('sends no events when disabled', () => {
    const service = create('localhost');
    service.track('read_complete', { slug: 'x' });
    expect((window as TestWindow).dataLayer).toBeUndefined();
  });

  it('sends an event with its parameters when enabled', () => {
    const service = create();
    service.track('read_complete', { slug: 'gerber-viewer' });
    expect(commands('event').at(-1)).toEqual([
      'event',
      'read_complete',
      { slug: 'gerber-viewer' },
    ]);
  });

  it('sends a once-per-page-view event only once', () => {
    const service = create();
    service.trackOnce('gerber_interaction');
    service.trackOnce('gerber_interaction');

    expect(commands('event').filter((entry) => entry[1] === 'gerber_interaction')).toHaveLength(1);
  });

  it('reopen shows the banner again after a choice was made', () => {
    const service = create();
    service.accept();
    expect(service.bannerVisible()).toBe(false);
    service.reopen();
    expect(service.bannerVisible()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: FAIL, cannot resolve `./analytics`.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/core/analytics/analytics.ts`:

```ts
import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  Injectable,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ANALYTICS_HOST, CONSENT_KEY, MEASUREMENT_ID, isEnabled } from './analytics.config';

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

  private enabled = false;
  private readonly sentOnce = new Set<string>();

  /** null until the visitor has answered the banner. */
  readonly choice = signal<ConsentChoice | null>(null);
  readonly bannerVisible = signal(false);

  init(): void {
    if (!this.isBrowser) return;

    this.choice.set(this.readChoice());
    this.enabled = isEnabled(this.isBrowser, this.host);

    if (this.enabled) this.bootstrapTag();

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

  private gtag(...args: unknown[]): void {
    (this.doc.defaultView as GtagWindow | null)?.gtag?.(...args);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/analytics/
git commit -m "Add the Analytics service with consent denied by default"
```

---

### Task 3: Page views on navigation, and wiring it up

**Files:**
- Modify: `src/app/core/analytics/analytics.ts`
- Create: `src/app/core/analytics/provide-analytics.ts`
- Modify: `src/app/app.config.ts`
- Modify: `src/app/core/analytics/analytics.spec.ts`

**Interfaces:**
- Consumes: `Analytics` from Task 2.
- Produces: `provideAnalytics(): EnvironmentProviders`.

The initializer runs **before** the router's initial navigation, so the landing page produces exactly one `page_view` through the same path as every later route. That is why this uses `provideAppInitializer` and not `afterNextRender`: initializing later would mean sending the first page view by hand, which is the double-count this design already rejected.

**The send is deferred by one render, and this is not optional.** `home` and `about` call `Seo.set(...)` in their constructors, so their titles are already correct at `NavigationEnd`. But [writing-post.component.ts](../../../src/app/pages/writing-post/writing-post.component.ts) and [project-detail.component.ts](../../../src/app/pages/project-detail/project-detail.component.ts) call it inside a `computed()` that only evaluates when the template reads it, during the render that follows. Sending synchronously would stamp the previous page's title onto every post and case study, which is exactly the traffic this is being installed to measure. So the handler clears the once-per-view set synchronously and schedules the send with `afterNextRender`.

- [ ] **Step 1: Write the failing test**

Append to `src/app/core/analytics/analytics.spec.ts`:

```ts
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ApplicationRef, Component } from '@angular/core';

@Component({ template: '<h1>About</h1>' })
class TestAboutComponent {}

describe('Analytics page views', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as TestWindow).dataLayer;
    delete (window as TestWindow).gtag;
    for (const script of tagScripts()) script.remove();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    for (const script of tagScripts()) script.remove();
  });

  it('sends one page_view per navigation, carrying the current title', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: PRODUCTION_HOST },
        provideRouter([{ path: 'about', component: TestAboutComponent, title: 'About' }]),
      ],
    });
    const service = TestBed.inject(Analytics);
    service.init();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/about');
    // The send is scheduled with afterNextRender, so wait for the render to
    // settle before asserting. This is also what proves the deferral works.
    await TestBed.inject(ApplicationRef).whenStable();

    const views = commands('event').filter((entry) => entry[1] === 'page_view');
    expect(views).toHaveLength(1);
    expect(views[0][2]).toMatchObject({ page_path: '/about', page_title: 'About' });
  });

  it('lets a once-per-page-view event fire again after a navigation', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: PRODUCTION_HOST },
        provideRouter([
          { path: 'about', component: TestAboutComponent, title: 'About' },
          { path: 'ai', component: TestAboutComponent, title: 'AI' },
        ]),
      ],
    });
    const service = TestBed.inject(Analytics);
    service.init();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/about');
    await TestBed.inject(ApplicationRef).whenStable();
    service.trackOnce('gerber_interaction');
    service.trackOnce('gerber_interaction');

    await harness.navigateByUrl('/ai');
    await TestBed.inject(ApplicationRef).whenStable();
    service.trackOnce('gerber_interaction');

    expect(commands('event').filter((entry) => entry[1] === 'gerber_interaction')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: FAIL, 0 page_view events received.

- [ ] **Step 3: Write minimal implementation**

In `src/app/core/analytics/analytics.ts`, add to the imports:

```ts
import { DestroyRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
```

Add the field next to the others:

```ts
  private readonly destroyRef = inject(DestroyRef);
```

Call the new method from `init()`, inside the enabled branch:

```ts
    if (this.enabled) {
      this.bootstrapTag();
      this.watchNavigation();
    }
```

And add the method:

```ts
  /**
   * Router is pulled from the injector here rather than injected in the
   * constructor on purpose. This service is injected into the Gerber demo
   * component, whose integration spec configures no router, and a constructor
   * injection would break it. This runs only when enabled, which is never in a
   * spec that has not asked for it.
   */
  private watchNavigation(): void {
    const router = this.injector.get(Router);
    const subscription = router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        // A new page, so once-per-view events may fire again. Synchronous,
        // unlike the send below, because it must happen before anything on the
        // new page has had a chance to call trackOnce.
        this.sentOnce.clear();
        this.schedulePageView();
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
  private schedulePageView(): void {
    afterNextRender(() => this.sendPageView(), { injector: this.injector });
  }

  private sendPageView(): void {
    const win = this.doc.defaultView;
    if (!win) return;
    this.gtag('event', 'page_view', {
      page_location: win.location.href,
      page_path: win.location.pathname,
      page_title: this.doc.title,
    });
  }
```

Create `src/app/core/analytics/provide-analytics.ts`:

```ts
import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { Analytics } from './analytics';

/**
 * App initializers run before the router's initial navigation, so the landing
 * page goes through the same NavigationEnd path as every later route and is
 * counted exactly once.
 */
export function provideAnalytics(): EnvironmentProviders {
  return provideAppInitializer(() => inject(Analytics).init());
}
```

Modify `src/app/app.config.ts`: add the import `import { provideAnalytics } from './core/analytics/provide-analytics';` and add `provideAnalytics(),` as the last entry in the `providers` array.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Verify nothing else regressed**

Run: `npx ng test --no-watch`
Expected: PASS, the whole suite.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/analytics/ src/app/app.config.ts
git commit -m "Send a page view on every navigation, including the first"
```

---

### Task 4: The consent banner and the footer link

**Files:**
- Create: `src/app/layout/consent-banner/consent-banner.component.ts`
- Create: `src/app/layout/consent-banner/consent-banner.component.html`
- Create: `src/app/layout/consent-banner/consent-banner.component.scss`
- Create: `src/app/layout/consent-banner/consent-banner.component.spec.ts`
- Modify: `src/app/app.component.ts`
- Modify: `src/app/layout/site-footer/site-footer.component.ts`
- Modify: `src/app/layout/site-footer/site-footer.component.html`
- Modify: `src/app/layout/site-footer/site-footer.component.scss`

**Interfaces:**
- Consumes: `Analytics` (`bannerVisible`, `accept`, `decline`, `reopen`).
- Produces: `ConsentBannerComponent` with selector `app-consent-banner`.

The banner carries the entire disclosure, because there is no privacy page. It must say what is collected, that nothing is stored before consent, and name Google, with a link out. Accept and Decline get equal visual weight: no dark patterns.

- [ ] **Step 1: Write the failing test**

Create `src/app/layout/consent-banner/consent-banner.component.spec.ts`:

```ts
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConsentBannerComponent } from './consent-banner.component';
import { Analytics } from '../../core/analytics/analytics';
import { ANALYTICS_HOST, CONSENT_KEY } from '../../core/analytics/analytics.config';

describe('ConsentBannerComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: 'localhost' },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(ConsentBannerComponent);
    const analytics = TestBed.inject(Analytics);
    fixture.detectChanges();
    return { fixture, analytics };
  }

  function buttons(fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] {
    return [...fixture.nativeElement.querySelectorAll('button')];
  }

  it('is hidden until something asks for it', () => {
    const { fixture } = render();
    expect(buttons(fixture)).toHaveLength(0);
  });

  it('shows both choices once visible', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    const labels = buttons(fixture).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Decline', 'Accept']);
  });

  it('names Google and links to its privacy policy', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Google');
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.href).toBe('https://policies.google.com/privacy');
  });

  it('stores the choice and dismisses itself on accept', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    buttons(fixture)[1].click();
    fixture.detectChanges();

    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(buttons(fixture)).toHaveLength(0);
  });

  it('stores the refusal and dismisses itself on decline', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    buttons(fixture)[0].click();
    fixture.detectChanges();

    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(buttons(fixture)).toHaveLength(0);
  });

  it('carries no em-dash, which the build forbids', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();
    // Built from its code point, not typed: verify-build scans authored source
    // for the character, so a literal one here would fail the build it guards.
    const emDash = String.fromCharCode(0x2014);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(emDash);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --no-watch --include src/app/layout/consent-banner/consent-banner.component.spec.ts`
Expected: FAIL, cannot resolve `./consent-banner.component`.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/layout/consent-banner/consent-banner.component.ts`:

```ts
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
```

Create `src/app/layout/consent-banner/consent-banner.component.html`:

```html
@if (analytics.bannerVisible()) {
  <aside class="banner" role="region" aria-label="Analytics choice">
    <p class="copy">
      This site counts page views and a few interactions, such as opening my CV, so I can tell
      which writing is worth continuing. Nothing is stored on your device unless you accept, and
      Google Analytics is the processor.
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
        Google's privacy policy
      </a>
    </p>

    <div class="actions">
      <button type="button" class="choice" (click)="analytics.decline()">Decline</button>
      <button type="button" class="choice" (click)="analytics.accept()">Accept</button>
    </div>
  </aside>
}
```

Create `src/app/layout/consent-banner/consent-banner.component.scss`:

```scss
// Tokens only, so both themes stay correct and verify-contrast keeps covering
// this text through the pairs it already walks.
.banner {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--panel);
  border-top: 1px solid var(--border);
}

.copy {
  margin: 0;
  max-width: 62ch;
  color: var(--ink-muted);
  font-size: 0.86rem;
}

.actions {
  display: flex;
  gap: var(--space-2);
}

// Equal weight on both. The refusal is not a smaller, greyer control.
.choice {
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: transparent;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    color 0.12s ease,
    border-color 0.12s ease;
}

.choice:hover {
  border-color: var(--meta);
}

.choice:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Modify `src/app/app.component.ts`: import `ConsentBannerComponent` from `./layout/consent-banner/consent-banner.component`, add it to `imports`, and add `<app-consent-banner />` as the last element of the template, after `<app-site-footer />`.

Modify `src/app/layout/site-footer/site-footer.component.ts`:

```ts
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
```

Modify `src/app/layout/site-footer/site-footer.component.html`: add this as the last `<li>` in the existing list, after the RSS entry:

```html
    <li>
      <button type="button" class="as-link" (click)="analytics.reopen()">Cookies</button>
    </li>
```

Modify `src/app/layout/site-footer/site-footer.component.scss`: append

```scss
// A button, not a link: it changes state on this page rather than going
// anywhere. It matches the links so the row still reads as one list.
.as-link {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --no-watch --include src/app/layout/consent-banner/consent-banner.component.spec.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Check the style budget and the whole suite**

Run: `npx ng test --no-watch && npm run build`
Expected: tests PASS; build succeeds with no `anyComponentStyle` budget warning for `consent-banner.component.scss`, and `verify-styles`, `verify-contrast` and `verify-build` all pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout/ src/app/app.component.ts
git commit -m "Add the consent banner and a footer link to reopen it"
```

---

### Task 5: The CV download event

**Files:**
- Modify: `src/app/core/analytics/analytics.ts`
- Modify: `src/app/core/analytics/analytics.spec.ts`

**Interfaces:**
- Consumes: `EVENT.cvDownload` from Task 1, `track` from Task 2.
- Produces: no new public API.

A delegated listener on the document rather than markup on the anchor, so [about.component.html:101](../../../src/app/pages/about/about.component.html) stays free of analytics concerns. It matches any anchor whose href ends in `.pdf`, which survives the CV file being renamed again.

- [ ] **Step 1: Write the failing test**

Append to the `describe('Analytics', ...)` block in `src/app/core/analytics/analytics.spec.ts`:

```ts
  it('reports a click on the CV as cv_download', () => {
    create();
    const anchor = document.createElement('a');
    anchor.href = '/assets/Ravi_Anand_Kumar_CV.pdf';
    anchor.textContent = 'Download my CV';
    document.body.appendChild(anchor);

    anchor.click();

    expect(commands('event').at(-1)).toEqual([
      'event',
      'cv_download',
      { file_name: 'Ravi_Anand_Kumar_CV.pdf' },
    ]);
    anchor.remove();
  });

  it('reports a click on a child of the CV link, not just the anchor itself', () => {
    create();
    const anchor = document.createElement('a');
    anchor.href = '/assets/Ravi_Anand_Kumar_CV.pdf';
    const span = document.createElement('span');
    anchor.appendChild(span);
    document.body.appendChild(anchor);

    span.click();

    expect(commands('event').at(-1)?.[1]).toBe('cv_download');
    anchor.remove();
  });

  it('ignores clicks on ordinary links', () => {
    create();
    const anchor = document.createElement('a');
    anchor.href = '/about';
    document.body.appendChild(anchor);

    anchor.click();

    expect(commands('event').filter((e) => e[1] === 'cv_download')).toHaveLength(0);
    anchor.remove();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: FAIL, no `cv_download` event pushed.

- [ ] **Step 3: Write minimal implementation**

In `src/app/core/analytics/analytics.ts`, add `EVENT` to the config import, call the new method from the enabled branch of `init()`:

```ts
    if (this.enabled) {
      this.bootstrapTag();
      this.watchNavigation();
      this.watchDownloads();
    }
```

And add:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --no-watch --include src/app/core/analytics/analytics.spec.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/analytics/
git commit -m "Report the CV download as its own event"
```

---

### Task 6: The read-depth directive

**Files:**
- Create: `src/app/core/analytics/read-depth.directive.ts`
- Create: `src/app/core/analytics/read-depth.directive.spec.ts`
- Modify: `src/app/pages/writing-post/writing-post.component.ts`
- Modify: `src/app/pages/writing-post/writing-post.component.html`
- Modify: `src/app/pages/project-detail/project-detail.component.ts`
- Modify: `src/app/pages/project-detail/project-detail.component.html`

**Interfaces:**
- Consumes: `Analytics.track`, `EVENT.readComplete`.
- Produces: `ReadDepthDirective`, selector `[appReadDepth]`, one required string input `appReadDepth` carrying the slug.

GA4's built-in scroll event fires at 90% of the whole document, which on these pages includes the rail and the footer. A sentinel after the last paragraph measures the article instead.

- [ ] **Step 1: Write the failing test**

Create `src/app/core/analytics/read-depth.directive.spec.ts`:

```ts
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReadDepthDirective } from './read-depth.directive';
import { Analytics } from './analytics';
import { ANALYTICS_HOST, PRODUCTION_HOST } from './analytics.config';

@Component({
  imports: [ReadDepthDirective],
  template: '<div [appReadDepth]="\'gerber-viewer\'"></div>',
})
class HostComponent {}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

describe('ReadDepthDirective', () => {
  let callbacks: ObserverCallback[];
  let disconnects: number;
  const original = globalThis.IntersectionObserver;

  beforeEach(() => {
    callbacks = [];
    disconnects = 0;

    class StubObserver {
      constructor(callback: ObserverCallback) {
        callbacks.push(callback);
      }
      observe(): void {}
      disconnect(): void {
        disconnects += 1;
      }
      unobserve(): void {}
      takeRecords(): [] {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    globalThis.IntersectionObserver = StubObserver as unknown as typeof IntersectionObserver;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: PRODUCTION_HOST },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  it('reports read_complete once when the sentinel comes into view', () => {
    const analytics = TestBed.inject(Analytics);
    const sent: unknown[][] = [];
    analytics.track = (name, params) => {
      sent.push([name, params]);
    };

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    callbacks[0]([{ isIntersecting: true }]);
    callbacks[0]([{ isIntersecting: true }]);

    expect(sent).toEqual([['read_complete', { slug: 'gerber-viewer' }]]);
    expect(disconnects).toBeGreaterThan(0);
  });

  it('reports nothing while the sentinel is off screen', () => {
    const analytics = TestBed.inject(Analytics);
    const sent: unknown[][] = [];
    analytics.track = (name, params) => {
      sent.push([name, params]);
    };

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    callbacks[0]([{ isIntersecting: false }]);

    expect(sent).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --no-watch --include src/app/core/analytics/read-depth.directive.spec.ts`
Expected: FAIL, cannot resolve `./read-depth.directive`.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/core/analytics/read-depth.directive.ts`:

```ts
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
      this.analytics.track(EVENT.readComplete, { slug: this.appReadDepth() });
      observer.disconnect(); // once per page view, not once per scroll
    });

    observer.observe(this.element.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --no-watch --include src/app/core/analytics/read-depth.directive.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Place the sentinel on both article pages**

In `src/app/pages/writing-post/writing-post.component.ts`, import `ReadDepthDirective` from `'../../core/analytics/read-depth.directive'` and add it to `imports` alongside `PageRailComponent`.

In `src/app/pages/writing-post/writing-post.component.html`, add the sentinel directly after the `<article>` element, inside `<main class="track-main">`:

```html
      <div [appReadDepth]="entry.slug" aria-hidden="true"></div>
```

Do the same in `src/app/pages/project-detail/project-detail.component.ts` (add the import and the entry in `imports`), and in `src/app/pages/project-detail/project-detail.component.html` add the identical line as the last element inside `<main class="track-main">`, after the `@if (showDemo())` block, so it sits below the demo rather than above it.

- [ ] **Step 6: Verify the build still passes**

Run: `npx ng test --no-watch && npm run build`
Expected: tests PASS; build succeeds. The empty div carries no heading and no asset reference, so `verify-build`'s heading and asset rules are unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/app/core/analytics/ src/app/pages/
git commit -m "Report reaching the end of a post or case study"
```

---

### Task 7: The Gerber demo interaction event

**Files:**
- Modify: `src/app/features/gerber-demo/gerber-demo.component.ts`

**Interfaces:**
- Consumes: `Analytics.trackOnce` from Task 2, `EVENT.gerberInteraction` from Task 1.
- Produces: no new public API.

**There is no new test in this task, and that is deliberate.** The once-per-page-view rule is
the only logic here, and it already has a unit test in `analytics.spec.ts` from Task 2 plus the
reset-on-navigation test from Task 3. `gerber-demo.integration.spec.ts` is a pure parser check
against the shipped sample; it never renders the component and configures no TestBed. Standing
up a jsdom rendering harness for `ngx-gerber`'s canvas to cover four one-line call sites would
cost far more than it proves, and it would put a fragile rendering test in front of a suite
whose whole point is to pin the parser's numbers.

What remains is placing the calls correctly, which Step 3 verifies by hand in a browser.

- [ ] **Step 1: Add the calls**

In `src/app/features/gerber-demo/gerber-demo.component.ts`, add to the imports:

```ts
import { Analytics } from '../../core/analytics/analytics';
import { EVENT } from '../../core/analytics/analytics.config';
```

Add the field next to the existing `store` injection:

```ts
  private readonly analytics = inject(Analytics);
```

Add the method:

```ts
  /**
   * Counts that a visitor drove the viewer, not how much. trackOnce keeps it to
   * one event per page view, so panning and re-picking files do not inflate it.
   * The sample loaded automatically on first render is deliberately not a call
   * site: nobody asked for it.
   */
  private noteInteraction(): void {
    this.analytics.trackOnce(EVENT.gerberInteraction);
  }
```

Call `this.noteInteraction();` as the first statement of exactly four methods:
`reloadSample()`, `onFilePicked()`, `onDrop()` and `onDragOver()`.

Do **not** add it to `onCursorMoved`, `setUnit`, `fit`, `zoomIn` or `zoomOut`. The first fires
on every pointer move, and the rest are secondary controls the spec did not ask for.

- [ ] **Step 2: Verify the existing suite still passes**

Run: `npx ng test --no-watch`
Expected: PASS. The parser integration spec is untouched and must stay green.

- [ ] **Step 3: Verify the call sites by hand**

Run: `npm start`, open http://localhost:4200/projects/gerber-viewer, scroll to the viewer and
click **Reload sample**.

Because localhost is not the production host, `trackOnce` returns early and nothing is sent,
which is the correct behaviour and means this step is checking placement, not delivery. Set a
breakpoint in `noteInteraction` and confirm it is reached by Reload sample, by opening a file,
and by dragging a file over the stage, and that the automatic sample load on first render does
**not** reach it.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/gerber-demo/
git commit -m "Report the first interaction with the Gerber viewer"
```

---

### Task 8: Build guardrails and documentation

**Files:**
- Modify: `tools/verify-build.mjs`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the built output in `dist/ravianand1988.github.io/browser`.
- Produces: two new failure conditions.

The first check is the one that matters. It pins the whole design: if the tag is ever moved into `index.html`, the consent gate is silently gone, and this fails the build instead of shipping it.

- [ ] **Step 1: Add the checks**

In `tools/verify-build.mjs`, insert this section immediately before the `if (failures.length)` block at the end:

```js
// --- Analytics is injected at runtime behind consent, never inlined.
//
// The whole consent design rests on gtag.js being appended by the Analytics
// service after a denied-by-default consent state is in place. Pasting Google's
// snippet into index.html would set cookies before any visitor agreed to
// anything, and it would look completely fine locally. So the prerendered HTML
// is checked for the tag host, and the emitted JS is checked for the ID.

const MEASUREMENT_ID = 'G-D3ZCLSGYT8';

for (const segments of pagePaths) {
  let markup;
  try {
    markup = await html(...segments);
  } catch {
    continue;
  }
  if (markup.includes('googletagmanager.com')) {
    const route = `/${segments.slice(0, -1).join('/')}`;
    failures.push(`${route} inlines the analytics tag, which bypasses the consent gate`);
  }
}

const jsFiles = (await readdir(BROWSER_DIR)).filter((name) => extname(name) === '.js');
let idOccurrences = 0;
for (const name of jsFiles) {
  const source = await readFile(join(BROWSER_DIR, name), 'utf8');
  idOccurrences += source.split(MEASUREMENT_ID).length - 1;
}
if (idOccurrences !== 1) {
  failures.push(
    `expected the measurement ID exactly once in the emitted JS, found ${idOccurrences}`,
  );
}
```

Then extend the final `console.log` template string by adding `, analytics tag not inlined` before the closing backtick.

- [ ] **Step 2: Run the build to verify the checks pass**

Run: `npm run build`
Expected: PASS. The `verify-build` line now ends with `analytics tag not inlined`.

- [ ] **Step 3: Prove the guardrail actually fails**

A check that has never failed is not a check. Temporarily add
`<script src="https://www.googletagmanager.com/gtag/js?id=G-D3ZCLSGYT8"></script>` to the
`<head>` of `src/index.html`, then run `npm run build`.
Expected: FAIL, with one `inlines the analytics tag` line per prerendered route.

Then remove that script tag again and re-run `npm run build` to confirm it passes.

- [ ] **Step 4: Document it**

In `CLAUDE.md`, under **Architecture**, add to the `src/app/core/` bullet a mention of
`analytics/` as the fourth core concern: the `Analytics` service, which loads `gtag.js` itself
behind Consent Mode rather than from `index.html`, and is inert off the production hostname.

Under **Verification**, add to the `verify-build` bullet that it also asserts no prerendered
page inlines the analytics tag and that the measurement ID appears exactly once in the emitted
JS.

Add a short **Analytics** section after **Deployment** recording the GA4 property settings that
are not code, since nothing in the repo can enforce them:

```markdown
## Analytics

GA4 property `G-D3ZCLSGYT8`, behind Google Consent Mode v2 with everything denied by default.
The design is in
[docs/superpowers/specs/2026-09-07-ga4-analytics-design.md](docs/superpowers/specs/2026-09-07-ga4-analytics-design.md).

Settings that live in the GA4 UI, not in this repo:

- Data retention: 14 months.
- Google signals: off.
- Enhanced Measurement, outbound clicks: on. This is where outbound link tracking comes from;
  there is no code for it.
- Enhanced Measurement, file downloads: off. Superseded by the `cv_download` event, which would
  otherwise be counted twice under two names.
- `cv_download` marked as a key event.
```

- [ ] **Step 5: Full verification**

Run: `npx ng test --no-watch && npm run test:tools && npm run build`
Expected: all three PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/verify-build.mjs CLAUDE.md
git commit -m "Fail the build if the analytics tag is ever inlined"
```

---

## After the plan

The GA4 property settings in Task 8 have to be applied by hand in the GA4 UI. Nothing in this
repo can check them, which is why they are written down. Outbound link tracking in particular
does not exist until Enhanced Measurement is on.

Verify the deployed result by loading the site with DevTools open: before accepting, there
should be requests to `googletagmanager.com` but no `_ga` cookie; after accepting, the cookie
appears and GA4's Realtime report shows the page view.
