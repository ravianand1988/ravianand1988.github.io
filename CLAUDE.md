# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ravi Anand Kumar's personal site: a writing-forward portfolio, deployed as a GitHub Pages **user
site** (https://ravianand1988.github.io/). Angular 21, routed, prerendered to static HTML at build
time. It is a content site, not a product. Most changes are copy edits to markdown in
[content/](content/) or to static markup in the page components, not new abstractions.

## Commands

```bash
npm install                                 # required after pulling: ngx-gerber comes from npm
npm start                                   # dev server on http://localhost:4200
npm run build                               # production build + prerender → dist/ravianand1988.github.io/browser
npm test                                    # Vitest via @angular/build:unit-test; watches in a TTY
ng test --no-watch                          # single CI-style run (jsdom under Node, no browser)
npm run test:tools                          # Vitest over tools/ (the content pipeline's pure functions)
```

`prestart`, `prebuild` and `pretest` all run `tools/build-content.mjs` first, so the generated
content module is always current. You do not run it by hand.

There is no linter or formatter configured. Formatting comes from [.editorconfig](.editorconfig):
2-space indent, single quotes in TS, final newline, no trailing whitespace.

## Architecture

Standalone components only, no NgModules, no state library. Components omit `standalone: true`; it
has been the default since Angular 19. Zoneless is the framework default in v21 and zone.js is not
installed.

- [main.ts](src/main.ts) bootstraps `AppComponent`.
  [app.config.ts](src/app/app.config.ts) provides the router with `withComponentInputBinding()`
  (route params are read as **signal inputs** on page components, which requires it) and
  `withInMemoryScrolling`, plus `provideClientHydration(withEventReplay())`.
- [app.component.ts](src/app/app.component.ts) has an inline template and is only a shell:
  `<app-site-header />`, `<router-outlet />`, `<app-site-footer />`.
- **Routing is real, not anchor-based.** [app.routes.ts](src/app/app.routes.ts) lazy-loads every
  page with `loadComponent`. `angular.json` sets `"outputMode": "static"`, so each route is
  prerendered to its own HTML file. Adding a page means adding a route here and a component under
  `src/app/pages/`.
- Directory boundaries:
  - `src/app/pages/` — one routed page each: home, projects-index, project-detail, writing-index,
    writing-post, ai, about, not-found.
  - `src/app/layout/` — site-header, site-footer.
  - `src/app/core/` — [content.ts](src/app/core/content.ts) (`ContentService`, reads the generated
    module) and [seo.ts](src/app/core/seo.ts) (`Seo`, per-route title, description and canonical).
    Every page calls `Seo.set(...)` in its constructor.
  - `src/app/features/gerber-demo/` — the live Gerber viewer. It **imports the published
    `ngx-gerber` package from npm**; it is not a vendored copy. That is deliberate: the case-study
    page is a consumer of the library like any other.

## Content pipeline

Markdown in [content/](content/) (`projects/`, `writing/`) is compiled at build time by
[tools/build-content.mjs](tools/build-content.mjs) into `src/generated/` — `content.ts` (front
matter plus rendered HTML, Shiki-highlighted), `slugs.json`, an RSS feed and a sitemap.

`src/generated/` is build output. **Never edit it by hand.** To change a case study or a post, edit
the markdown. Front matter requires `title`, `description`, `date` and `pillar`; `assertEntry` in
[tools/lib/content.mjs](tools/lib/content.mjs) fails the build if a field is missing.

## Styling

[src/styles/](src/styles/) is the design system, entered via `index.scss`:

- `_tokens.scss` — CSS custom properties on `:root` with a `@media (prefers-color-scheme: dark)`
  override block.
- `_typography.scss` — self-hosted `@font-face` rules, element defaults, and shared utilities
  (`.wrap`, `.eyebrow`, `.rule`, `.row`).
- `_prose.scss` — typographic defaults for compiled markdown.

Component SCSS handles only component-specific layout and should consume the `var(--…)` tokens
rather than hard-coded colours, so both themes stay correct.

Two build-time guardrails, both easy to trip:

- Component styles are budgeted at 2 kB (warning) / 4 kB (error) in
  [angular.json](angular.json). A bloated `*.component.scss` fails the production build.
- [tools/verify-styles.mjs](tools/verify-styles.mjs) asserts that specific token names appear in the
  emitted CSS (currently `--paper`, `--ink`, `--accent`, `--font-display`, `--font-mono`,
  `--measure-prose`). **Renaming a token means updating that list in the same commit**, or the build
  fails after the change looks fine locally.

## Verification

`postbuild` runs four scripts in order: `tools/postbuild.mjs`, then
[verify-styles.mjs](tools/verify-styles.mjs), [verify-contrast.mjs](tools/verify-contrast.mjs) and
[verify-build.mjs](tools/verify-build.mjs).

- **verify-styles** asserts the token names and the three self-hosted font files are in the emitted
  CSS, and that nothing requests a third-party font host.
- **verify-contrast** reads the emitted CSS and walks every text token against every surface token
  in both themes, failing below 4.5:1. It reads the shipped CSS rather than the SCSS so it checks
  what actually went out.
- **verify-build** checks the prerendered HTML: every slug produced a page, metadata and canonicals
  are present, asset references are not relative, no em-dashes, exactly one h1 per page with no
  skipped heading level, and the `Person` JSON-LD parses with every `sameAs` profile actually
  linked on the page. It also pins numbers quoted on the Gerber page to what the `ngx-gerber`
  package returns, so a dependency upgrade that changed the geometry fails the build instead of
  publishing a false claim.

If you add a claim backed by a number, prefer adding a check here over trusting the prose.

[tools/build-og-image.mjs](tools/build-og-image.mjs) is **not** part of the build. It regenerates
`src/assets/og-default.png`, which is committed; rerun it by hand when the wording or the palette
changes. Two traps are documented in the file: opentype.js emits `NaN` into path data for glyphs at
fractional x offsets, and it parses the `fvar` table without applying it, so outlines come out at
the font's default weight.

## Deployment

Push to `master` → [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs
`npm ci && npm run build` and publishes `dist/ravianand1988.github.io/browser` through GitHub Pages'
native Actions deployment. The workflow's artifact path is tied to `outputPath` in
[angular.json](angular.json); changing one requires changing the other. Repo
**Settings → Pages** source must stay on **GitHub Actions**.

## Content accuracy

The site states this person's real employment history, dates, and claims that recruiters read.
Several commits in the history exist purely to walk back unverified metrics and overstated scope. Do
not invent, round up, or embellish achievements, numbers, dates, or job titles. Write only what has
been confirmed, and ask when a claim is not already in the file.

Specifics that have already been decided:

- **byrd is `Oct 2019 to Present`** on every surface. Do not write a 2026 end date; the employment
  is still formal. Prose may say "since 2019".
- **Assistr is Oct 2017 to Sep 2019.** Do not flip it to Sep 2017 to Oct 2019.
- Experience is framed as **twelve years in software** (engineering roles start Dec 2013) and
  fifteen years in the industry (including the 2011–2013 training roles). Do not write "13+ years of
  software engineering"; the dates on [about.component.html](src/app/pages/about/about.component.html)
  do not support it.
- No em-dashes in the copy. `verify-build.mjs` enforces this.

## Design direction

An approved re-skin is specified in
[docs/superpowers/specs/2026-08-27-core-and-consumers-design.md](docs/superpowers/specs/2026-08-27-core-and-consumers-design.md).
It replaces the current cream/serif/terracotta visual layer with a cool graphite ground, brass as
the only chroma, and Archivo as the display face. The information architecture, content pipeline and
prerendering are unaffected. Read that spec before changing tokens or type.
