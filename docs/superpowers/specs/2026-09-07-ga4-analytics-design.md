# GA4 analytics with consent mode

Status: approved, not yet implemented
Date: 2026-09-07
Branch: `feat/add_analytics_GA`
Measurement ID: `G-D3ZCLSGYT8`

## Why

The site has no analytics of any kind. There is no way to tell whether the case studies get
read, whether the CV gets downloaded, or which page a recruiter arrives on. Every content
decision made so far has been made blind.

The constraint is that the author is in Berlin and the audience is largely EU, so GA4's
cookies fall under GDPR and the TTDSG. Analytics storage has to be denied until a visitor
agrees, and the disclosure has to happen before the agreement.

## Decisions taken

Recorded here because each one closed off alternatives that a later reader might otherwise
reopen.

1. **Google Consent Mode v2, denied by default, with a banner.** `gtag.js` loads for
   everyone but with `analytics_storage` and all three ad signals denied, so no cookies are
   set and GA4 receives only cookieless pings. Accepting flips `analytics_storage` to
   granted. Declining changes nothing, because denied is already the state.
2. **The tag is injected by Angular after hydration, not pasted into `index.html`.** The
   standard gtag snippet was rejected: it sets cookies before consent, and its
   `gtag('config', ...)` fires an automatic page view that would double-count against the
   router-driven one. Keeping the logic in one TypeScript file also means Vitest can reach
   it, and consent-before-script ordering is guaranteed because one function controls both.
3. **The Measurement ID is a hardcoded constant.** GA4 IDs ship in the page source of every
   site that uses GA4, so a build-time secret would add a second code path and a workflow
   step for no security gain.
4. **No `/privacy` route.** The banner carries the whole disclosure and links to Google's
   privacy policy. This was a deliberate choice against a fuller notice; if an imprint is
   ever needed, a route is the place it goes.
5. **Outbound clicks come from Enhanced Measurement, not from code.** GA4 tracks them with
   no instrumentation. The trade is that the setting lives in the GA4 UI where
   `verify-build.mjs` cannot enforce it, which is why the property settings are written
   down in this document.

## Structure

New folder `src/app/core/analytics/`, alongside the existing `content.ts`, `seo.ts` and
`theme.ts` services:

| File | Responsibility |
| --- | --- |
| `analytics.config.ts` | Measurement ID, production hostname, storage key, event names |
| `analytics.ts` | `Analytics` service and the pure `isEnabled` function |
| `read-depth.directive.ts` | IntersectionObserver sentinel for the read-depth event |
| `analytics.spec.ts` | Unit tests, shaped after `theme.spec.ts` |
| `read-depth.directive.spec.ts` | Directive tests with a stubbed IntersectionObserver |

Plus:

- `src/app/layout/consent-banner/` (component, template, SCSS, spec). It is site-wide chrome,
  so it belongs beside the header and footer, and it is rendered from `AppComponent`.
- `provideAnalytics()` wired into `app.config.ts`, which runs the service's `init()` through
  an app initializer.

## The kill switch

The service does nothing unless all of the following hold:

- the platform is the browser (`isPlatformBrowser`), which excludes prerendering in Node;
- `location.hostname === 'ravianand1988.github.io'`, which excludes `npm start`, any local
  production build, and jsdom under Vitest;
- `gtag.js` has actually loaded.

This is expressed as a pure exported function so it can be tested directly:

```ts
export function isEnabled(isBrowser: boolean, hostname: string): boolean
```

jsdom makes `location` awkward to override, so the service reads the hostname once and hands
it to this function. The function is the unit under test, not the service's environment.

Because the hostname guard fails under test, no spec in the repo ever contacts Google, and
the existing `gerber-demo.integration.spec.ts` keeps passing untouched.

## Consent flow

On first browser render, in this exact order:

1. Define `window.dataLayer` and the `gtag` shim.
2. `gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied',
   ad_user_data: 'denied', ad_personalization: 'denied' })`.
3. If `localStorage` holds a granted choice from a previous visit, push the
   `consent update` now, before the script exists, so a returning visitor is never
   briefly denied.
4. Append `https://www.googletagmanager.com/gtag/js?id=G-D3ZCLSGYT8` with `async`.
5. `gtag('js', new Date())` and `gtag('config', 'G-D3ZCLSGYT8', { send_page_view: false })`.
6. Subscribe to the router's `NavigationEnd`. Nothing is sent here directly.

**Initialization timing matters.** `init()` runs from `provideAppInitializer`, guarded by
`isPlatformBrowser`, and **not** from `afterNextRender`. App initializers run before the
router's initial navigation, so the subscription is in place when the first `NavigationEnd`
fires and the landing page produces exactly one `page_view` through the same path as every
later route. Initializing after the first navigation would mean sending the landing page view
by hand, which is the double-count this design already rejected in the pasted snippet.

The ad signals stay denied permanently. The site runs no ads, so requesting them would be a
claim it cannot justify.

Storage: `localStorage`, key `analytics-consent`, values `granted` or `denied`. Every read and
write is wrapped in `try` / `catch`, matching `theme.ts`, because storage throws in Safari
private mode and in blocked third-party contexts. A failed write must not stop the choice
from applying to the current page view.

## The banner

Renders only when nothing is stored. It is therefore absent from every prerendered page and
appears on hydration, which is correct: the prerendered HTML cannot know a visitor's choice.

Content requirements, since there is no privacy page to carry them:

- what is collected (page views and the interaction events listed below);
- that nothing is stored until the visitor accepts;
- Google named as the processor, with a link to Google's privacy policy;
- an Accept button and a Decline button, given equal visual weight.

Both buttons write the choice and dismiss the banner. Accept additionally pushes the consent
update. No dark patterns: Decline is not a smaller, greyer, or harder-to-find control.

**Withdrawal.** A `Cookies` link joins the existing list in
`site-footer.component.html`, reopening the banner so a visitor who accepted can revoke.
Withdrawal has to be as easy as granting, and without this there is no route back.

Styling consumes existing tokens only, so it stays inside the 2 kB component style budget in
`angular.json` and inside the text-on-surface pairs `verify-contrast.mjs` already walks. The
copy carries no em-dashes and no `h1`, so the existing `verify-build.mjs` rules cover it.

## Events

| Event | Source | Notes |
| --- | --- | --- |
| `page_view` | `Analytics`, on router `NavigationEnd` | `page_location`, `page_path`, `page_title` |
| outbound click | GA4 Enhanced Measurement | No code. Covers footer, `/about`, and future links |
| `cv_download` | Delegated click listener | The anchor at `about.component.html:101` |
| `read_complete` | `read-depth.directive.ts` | Sentinel after the last paragraph |
| `gerber_interaction` | `gerber-demo.component.ts` | At most once per page view |

**Page views.** GA is configured with `send_page_view: false`, so the service owns every one
of them. Reading `document.title` at `NavigationEnd` is correct because each page calls
`Seo.set(...)` in its constructor, which runs during route activation, before that event
fires.

**CV download.** One delegated listener on the document, not markup on the anchor, so the
about page stays free of analytics concerns. It is a custom event name rather than GA4's
recommended `file_download` because it is the closest thing this site has to a conversion and
deserves its own row. Enhanced Measurement's file-download tracking is turned off so the one
downloadable file on the site is not counted twice under two names.

**Read depth.** Enhanced Measurement's built-in `scroll` event fires at 90% of the whole
document, which on these pages includes the rail and the footer, so it would overcount. A
sentinel placed after the article's last paragraph in `writing-post` and `project-detail`
measures what was actually asked about. Fires once per page view.

**Gerber interaction.** One call in the component's existing handlers, on the first of: opening
a file, reloading the sample, or the first drag. Not per pointer move.

## Testing

`analytics.spec.ts`:

- `isEnabled` returns false on the server, false on localhost, true on the production host.
- Consent defaults to all four signals denied.
- Nothing is injected, and no `dataLayer` entry is written, when disabled.
- A stored grant is pushed **before** the script element is appended, not after.
- Accept pushes `consent update` with `analytics_storage: 'granted'` and leaves the ad
  signals denied.
- `track()` no-ops when disabled.
- One `NavigationEnd` produces exactly one `page_view`, carrying the current title.

`consent-banner.component.spec.ts`: hidden when a choice is stored, visible when it is not,
and each button writes the right value and dismisses.

`read-depth.directive.spec.ts`: fires once when the sentinel intersects, never twice.

## Build guardrails

Two additions to `verify-build.mjs`, following the CLAUDE.md rule that a claim backed by a
mechanism should be checked rather than trusted:

1. **No prerendered page may contain `googletagmanager.com`.** This pins the whole design. If
   the tag is ever moved back into `index.html`, the consent gate is silently gone, and this
   fails the build instead of shipping it.
2. **The Measurement ID must appear in the emitted JS exactly once.** Proves the code shipped
   and was not tree-shaken, and catches a second copy of the config.

## GA4 property settings

Not code, so recorded here. Required in the GA4 UI for the design above to hold:

- Data retention: 14 months.
- Google signals: **off**.
- Enhanced Measurement, outbound clicks: **on**.
- Enhanced Measurement, file downloads: **off** (superseded by `cv_download`).
- `cv_download` marked as a key event.

## Out of scope

- A `/privacy` route or an imprint. Decision 4.
- Any advertising or remarketing signal.
- Server-side tagging, a proxied first-party endpoint, or anything that hides the request
  from a visitor's blocker.
- Cross-domain measurement. There is one domain.
