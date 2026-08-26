# Portfolio Authority-Site Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-page CV-in-HTML portfolio with a writing-forward authority site: real per-page URLs, prerendered to static HTML, driven by markdown, on a self-hosted-type design system.

**Architecture:** Angular 21 standalone components with the router, built with `outputMode: "static"` so every route is prerendered to its own `index.html` with its own `<title>` and Open Graph tags. Markdown in `content/` is compiled by a Node prebuild script into generated TypeScript modules plus `rss.xml` and `sitemap.xml`. Route enumeration for `:slug` routes comes from `getPrerenderParams` reading a generated slug module.

**Tech Stack:** Angular 21.2 (`@angular/build:application`), `@angular/ssr` 21.2, `@angular/router` 21.2, `gray-matter`, `marked`, `shiki`, Vitest, SCSS. Deployed to GitHub Pages via the existing Actions workflow.

**Spec:** [`docs/superpowers/specs/2026-08-26-authority-site-redesign-design.md`](../specs/2026-08-26-authority-site-redesign-design.md)

## Global Constraints

Every task's requirements implicitly include this section.

- **Branch:** `feat/authority-site-redesign-rk`. Never commit to `master`.
- **Angular 21 idiom.** Standalone components only. Do **not** write `standalone: true` — it has been the default since v19. No NgModules. Zoneless is the framework default and `zone.js` is not installed. Use `inject()` over constructor injection in services. Use built-in control flow (`@for`, `@if`), not `NgFor`/`NgIf`.
- **`outputMode: "static"`.** The `prerender` build option is **silently ignored** when `outputMode` is set — the build prints `The "prerender" option is not considered when "outputMode" is specified.` Route selection comes from `serverRoutes` in `src/app/app.routes.server.ts`. There is no `routesFile`.
- **Deploy artifact path is fixed:** `dist/ravianand1988.github.io/browser`. `.github/workflows/deploy.yml` already points there. Do not change `outputPath` in `angular.json`.
- **`404.html` is a copy of `index.csr.html`**, never of `index.html`. `index.html` is the prerendered homepage and would render homepage content under every unknown URL.
- **Component style budget:** 2 kB warning / 4 kB error per component (`angular.json`). Prose and token styles live in global `src/styles/`, never in a component.
- **Colours come from tokens.** Component SCSS consumes `var(--…)` and never hard-codes a colour, so both themes stay correct.
- **Fonts are self-hosted** from `src/fonts/`. No runtime request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- **Copy rules.** No em-dashes in site copy; use plain punctuation. No buzzwords. Direct, confident tone.
- **Content accuracy is a hard rule.** Never invent, round up, or embellish an achievement, number, date or job title. If a claim is not already in the spec's "Verified project facts" section or the existing site, it does not go on the page. Several commits in this repo's history exist purely to walk back unverified metrics.
- **`src/generated/` is gitignored.** It is build output, never committed.

**Not deployable mid-plan.** Task 1 deletes the old section components, so the branch renders an empty shell until Task 9 lands the homepage. `master` is unaffected throughout. Do not deploy from this branch until Task 12 is complete.

**Verified facts available for copy** (from the spec, do not re-derive): the ERP section, the byrd bullet reduction, and the through-line. Three claims are **still unconfirmed** and must not be published until Ravi confirms them: the Selenium end-to-end coverage claim, "500+ customers", and "100,000+ orders/month". Task 12 is gated on this.

---

### Task 1: Prerendering infrastructure and app shell

Replaces the anchor-scrolled single page with a routed, prerendered shell. Deletes the eight old section components.

**Files:**
- Modify: `package.json` (add `@angular/router`, `@angular/ssr`)
- Modify: `angular.json` (build options)
- Create: `src/main.server.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.server.ts` (via `ng add`, then edited)
- Create: `src/app/app.routes.ts`
- Create: `src/app/pages/not-found/not-found.component.ts`
- Modify: `src/app/app.component.ts`, `src/app/app.config.ts`
- Delete: `src/app/app.component.html`, `src/app/app.component.scss`, `src/server.ts`, `src/app/sections/` (all eight components)
- Create: `tools/postbuild.mjs`
- Modify: `src/app/app.component.spec.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `routes` (`Routes`) from `src/app/app.routes.ts`; `serverRoutes` (`ServerRoute[]`) from `src/app/app.routes.server.ts`; `appConfig` (`ApplicationConfig`) from `src/app/app.config.ts`; `AppComponent` shell rendering `<router-outlet />`.

- [ ] **Step 1: Install the two packages**

```bash
npm install @angular/router@^21.2.0 --save-exact=false
npx ng add @angular/ssr --skip-confirmation --defaults --interactive=false
```

`ng add` scaffolds `src/main.server.ts`, `src/app/app.config.server.ts`, `src/app/app.routes.server.ts` and `src/server.ts`, and sets `outputMode: "server"` with an `ssr` key. The next step corrects that.

- [ ] **Step 2: Switch the build to static output**

Run:

```bash
node -e '
const fs=require("fs");const p="angular.json";const d=JSON.parse(fs.readFileSync(p,"utf8"));
const o=d.projects["ravianand1988.github.io"].architect.build.options;
o.outputMode="static"; delete o.ssr; delete o.prerender;
fs.writeFileSync(p, JSON.stringify(d,null,2)+"\n");
console.log("outputMode:",o.outputMode,"| ssr key:", "ssr" in o, "| server:", o.server);
'
rm -f src/server.ts
```

Expected output: `outputMode: static | ssr key: false | server: src/main.server.ts`

`server` (pointing at `src/main.server.ts`) must stay — static mode uses it for the prerender pass.

- [ ] **Step 3: Write the failing shell test**

Replace `src/app/app.component.spec.ts` entirely:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renders a router outlet rather than stacked sections', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
    expect(el.querySelector('app-hero')).toBeNull();
  });
});
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `npx ng test --no-watch --include='**/app.component.spec.ts'`
Expected: FAIL — `./app.routes` does not exist yet.

- [ ] **Step 5: Create the route table**

Create `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Ravi Anand Kumar, Frontend Tech Lead',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found',
  },
];
```

The home route points at `NotFoundComponent` as a deliberate placeholder; Task 9 replaces it with the real homepage. This keeps Task 1 shippable as a skeleton without inventing a stub component that later gets deleted.

- [ ] **Step 6: Create the not-found page**

Create `src/app/pages/not-found/not-found.component.ts`:

```typescript
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
```

- [ ] **Step 7: Rewrite the shell and config**

Replace `src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {}
```

Replace `src/app/app.config.ts`:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideClientHydration(withEventReplay()),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
  ],
};
```

Delete the old shell files and sections:

```bash
rm -f src/app/app.component.html src/app/app.component.scss
rm -rf src/app/sections
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx ng test --no-watch --include='**/app.component.spec.ts'`
Expected: PASS

- [ ] **Step 9: Write the 404 postbuild script**

Create `tools/postbuild.mjs`:

```javascript
import { copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');

// GitHub Pages serves 404.html for unmatched paths. It must be the CSR shell,
// not index.html: index.html is the prerendered homepage and would show
// homepage content under every unknown URL.
const source = join(BROWSER_DIR, 'index.csr.html');
const target = join(BROWSER_DIR, '404.html');

await access(source);
await copyFile(source, target);
console.log(`postbuild: wrote ${target} from index.csr.html`);
```

Add the hook to `package.json` scripts:

```json
"postbuild": "node tools/postbuild.mjs"
```

- [ ] **Step 10: Ignore generated output**

Append to `.gitignore`:

```
# build-time generated content modules and public files
/src/generated/
```

- [ ] **Step 11: Build and verify prerendering works end to end**

Run: `npm run build`

Expected: the build prints `Prerendered 1 static route.` then `postbuild: wrote dist/ravianand1988.github.io/browser/404.html from index.csr.html`.

One route, not two: the `**` wildcard has no concrete URL, so route discovery
only finds `''`. Every later task that adds a concrete path raises this count.

Verify:

```bash
ls dist/ravianand1988.github.io/browser/index.html \
   dist/ravianand1988.github.io/browser/index.csr.html \
   dist/ravianand1988.github.io/browser/404.html
grep -o '<title>[^<]*</title>' dist/ravianand1988.github.io/browser/index.html
```

Expected: all three files exist; the title reads `<title>Ravi Anand Kumar, Frontend Tech Lead</title>`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Route the site and prerender it to static HTML

Replaces the anchor-scrolled single page with the Angular router under
outputMode: static, so every route becomes its own prerendered HTML file
with its own title. Deletes the eight section components; the homepage
lands in a later commit.

404.html is copied from index.csr.html rather than index.html, so an
unknown URL boots the app instead of showing homepage content."
```

---

### Task 2: Editorial Ink design system

Self-hosted fonts, both colour themes, the type scale, and prose styling.

**Files:**
- Create: `src/fonts/` (woff2 files)
- Create: `src/styles/_tokens.scss`, `src/styles/_typography.scss`, `src/styles/_prose.scss`, `src/styles/index.scss`
- Delete: `src/styles.scss`
- Modify: `angular.json` (styles entry, assets entry for fonts)
- Create: `tools/verify-styles.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties on `:root` — `--paper`, `--paper-raised`, `--ink`, `--ink-muted`, `--ink-subtle`, `--meta`, `--rule`, `--rule-soft`, `--accent`, `--brass`; type tokens `--font-display`, `--font-body`, `--font-mono`; utility classes `.wrap`, `.eyebrow`, `.rule`, `.row`, `.prose`.

- [ ] **Step 1: Fetch the three typefaces as woff2**

Run:

```bash
mkdir -p src/fonts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
fetch_family () {
  local q="$1" out="$2"
  curl -s -H "User-Agent: $UA" "https://fonts.googleapis.com/css2?family=${q}&display=swap" \
    | grep -oE 'https://fonts\.gstatic\.com[^)]*\.woff2' | sort -u | head -1 \
    | xargs -r curl -s -o "src/fonts/${out}.woff2"
  ls -la "src/fonts/${out}.woff2"
}
fetch_family "Instrument+Serif" instrument-serif-400
fetch_family "Instrument+Serif:ital@1" instrument-serif-400-italic
fetch_family "Geist:wght@300..700" geist-variable
fetch_family "Geist+Mono:wght@400..500" geist-mono-variable
```

Expected: four non-empty `.woff2` files in `src/fonts/`.

If any file comes back empty (Google's CSS API changed, or no network), stop and tell Ravi rather than falling back to a CDN link — the "no third-party font request" constraint is not negotiable.

- [ ] **Step 2: Write the tokens**

Create `src/styles/_tokens.scss`:

```scss
:root {
  --paper: #faf7f2;
  --paper-raised: #ffffff;
  --ink: #17130e;
  --ink-muted: #4a4238;
  --ink-subtle: #6b6252;
  --meta: #8a7b65;
  --rule: #dcd5c9;
  --rule-soft: #eae4d9;
  --accent: #7c2a20;
  --brass: #c9a15b;

  --font-display: 'Instrument Serif', Georgia, 'Times New Roman', serif;
  --font-body: 'Geist', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  --step--1: clamp(0.82rem, 0.8rem + 0.1vw, 0.88rem);
  --step-0: clamp(1rem, 0.97rem + 0.15vw, 1.06rem);
  --step-1: clamp(1.2rem, 1.1rem + 0.4vw, 1.4rem);
  --step-2: clamp(1.5rem, 1.3rem + 0.9vw, 2rem);
  --step-3: clamp(2.1rem, 1.6rem + 2.2vw, 3.5rem);

  --measure-prose: 68ch;
  --measure-head: 24ch;
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.75rem;
  --space-4: 3rem;
  --space-5: 5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14110d;
    --paper-raised: #1c1813;
    --ink: #f0eae0;
    --ink-muted: #a79b8a;
    --ink-subtle: #8d8272;
    --meta: #9c8e78;
    --rule: #2e2820;
    --rule-soft: #241f19;
    --accent: #d9705e;
    --brass: #c9a15b;
  }
}
```

- [ ] **Step 3: Write typography and base layout**

Create `src/styles/_typography.scss`:

```scss
@font-face {
  font-family: 'Instrument Serif';
  src: url('/assets/fonts/instrument-serif-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Instrument Serif';
  src: url('/assets/fonts/instrument-serif-400-italic.woff2') format('woff2');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'Geist';
  src: url('/assets/fonts/geist-variable.woff2') format('woff2-variations');
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('/assets/fonts/geist-mono-variable.woff2') format('woff2-variations');
  font-weight: 400 500;
  font-style: normal;
  font-display: swap;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-font-smoothing: antialiased;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--step-0);
  line-height: 1.6;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 400;
  line-height: 1.06;
  letter-spacing: -0.015em;
  margin: 0 0 var(--space-2);
  max-width: var(--measure-head);
}

h1 {
  font-size: var(--step-3);
}
h2 {
  font-size: var(--step-2);
}
h3 {
  font-size: var(--step-1);
}

a {
  color: var(--accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: text-decoration-color 0.15s ease;
}

.wrap {
  max-width: 74ch;
  margin: 0 auto;
  padding: var(--space-5) var(--space-3);
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--meta);
  margin: 0 0 var(--space-2);
}

.rule {
  height: 1px;
  background: var(--rule);
  border: 0;
  margin: var(--space-4) 0 var(--space-3);
}

.row {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--rule-soft);
}

.row:last-child {
  border-bottom: 0;
}

.row .row-meta {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--meta);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (max-width: 640px) {
  .row {
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-2);
  }
  .row .row-meta {
    margin-left: 0;
  }
}
```

- [ ] **Step 4: Write prose styles for rendered markdown**

Create `src/styles/_prose.scss`:

```scss
.prose {
  max-width: var(--measure-prose);
  color: var(--ink-muted);
}

.prose > * + * {
  margin-top: var(--space-2);
}

.prose h2,
.prose h3 {
  color: var(--ink);
  margin-top: var(--space-4);
}

.prose blockquote {
  margin: var(--space-3) 0;
  padding-left: var(--space-2);
  border-left: 2px solid var(--brass);
  color: var(--ink-subtle);
  font-style: italic;
}

.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.prose pre {
  font-family: var(--font-mono);
  font-size: 0.86rem;
  line-height: 1.55;
  padding: var(--space-2);
  border: 1px solid var(--rule);
  border-radius: 6px;
  overflow-x: auto;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--step--1);
  display: block;
  overflow-x: auto;
}

.prose th,
.prose td {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--rule-soft);
}

.prose th {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--meta);
}
```

Create `src/styles/index.scss`:

```scss
@use 'tokens';
@use 'typography';
@use 'prose';
```

Delete the old stylesheet:

```bash
rm -f src/styles.scss
```

- [ ] **Step 5: Point the build at the new stylesheet and ship the fonts**

Run:

```bash
node -e '
const fs=require("fs");const p="angular.json";const d=JSON.parse(fs.readFileSync(p,"utf8"));
const o=d.projects["ravianand1988.github.io"].architect.build.options;
o.styles=["src/styles/index.scss"];
o.assets=["src/favicon.ico","src/assets",{glob:"*.woff2",input:"src/fonts",output:"/assets/fonts"}];
fs.writeFileSync(p, JSON.stringify(d,null,2)+"\n");
console.log(JSON.stringify({styles:o.styles,assets:o.assets},null,2));
'
```

- [ ] **Step 6: Write the style verification script**

Create `tools/verify-styles.mjs`:

```javascript
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');

const files = await readdir(BROWSER_DIR);
const cssName = files.find((f) => f.startsWith('styles-') && f.endsWith('.css'));
if (!cssName) throw new Error('no emitted styles-*.css found');
const css = await readFile(join(BROWSER_DIR, cssName), 'utf8');

const required = ['--paper', '--ink', '--accent', '--font-display', '--font-mono', '--measure-prose'];
const missing = required.filter((token) => !css.includes(token));
if (missing.length) throw new Error(`tokens missing from emitted CSS: ${missing.join(', ')}`);

if (!css.includes('prefers-color-scheme:dark') && !css.includes('prefers-color-scheme: dark')) {
  throw new Error('no dark theme block in emitted CSS');
}

if (css.includes('fonts.gstatic.com') || css.includes('fonts.googleapis.com')) {
  throw new Error('emitted CSS requests a third-party font host');
}

const fonts = await readdir(join(BROWSER_DIR, 'assets', 'fonts'));
const woff2 = fonts.filter((f) => f.endsWith('.woff2'));
if (woff2.length < 4) throw new Error(`expected 4 self-hosted woff2 files, found ${woff2.length}`);

console.log(`verify-styles: ${required.length} tokens present, dark theme present, ${woff2.length} self-hosted fonts, no third-party font hosts`);
```

Chain it into the postbuild hook in `package.json`:

```json
"postbuild": "node tools/postbuild.mjs && node tools/verify-styles.mjs"
```

- [ ] **Step 7: Run it to make sure it fails first**

Run: `node tools/verify-styles.mjs`
Expected: FAIL — the current `dist/` is from Task 1 and has no `assets/fonts` directory.

- [ ] **Step 8: Build and verify**

Run: `npm run build`

Expected: build succeeds, then `verify-styles: 6 tokens present, dark theme present, 4 self-hosted fonts, no third-party font hosts`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add the Editorial Ink design system

Self-hosted Instrument Serif, Geist and Geist Mono, a token set with a
warm dark counterpart, a fluid type scale, and prose styling for rendered
markdown. Replaces styles.scss and its alternating grey bands.

verify-styles.mjs runs after every build and fails it if a token goes
missing, the dark theme disappears, a font stops being self-hosted, or
anything reintroduces a request to a third-party font host."
```

---

### Task 3: Content pipeline pure functions

The only real logic in the site, so it gets real tests. No Angular involvement.

**Files:**
- Create: `tools/lib/content.mjs`
- Create: `tools/lib/content.spec.mjs`
- Create: `vitest.tools.config.mts`
- Modify: `package.json` (add `test:tools` script)

**Interfaces:**
- Consumes: nothing.
- Produces, all from `tools/lib/content.mjs`:
  - `slugify(input: string): string`
  - `isPublished(entry: { draft?: boolean }): boolean`
  - `byDateDesc(a: { date: string }, b: { date: string }): number`
  - `PILLARS: readonly string[]`
  - `assertEntry(entry: object, sourcePath: string): void` — throws on a missing or invalid required field
  - `buildRssXml(opts: { siteUrl: string, title: string, description: string, items: Array<{ title: string, description: string, path: string, date: string }> }): string`
  - `buildSitemapXml(opts: { siteUrl: string, paths: string[] }): string`

- [ ] **Step 1: Add the Vitest config for tools and a script**

Create `vitest.tools.config.mts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/**/*.spec.mjs'],
  },
});
```

Add to `package.json` scripts:

```json
"test:tools": "vitest run --config vitest.tools.config.mts"
```

- [ ] **Step 2: Write the failing tests**

Create `tools/lib/content.spec.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import {
  slugify,
  isPublished,
  byDateDesc,
  assertEntry,
  buildRssXml,
  buildSitemapXml,
} from './content.mjs';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('What a Team Actually Does')).toBe('what-a-team-actually-does');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('GST, invoicing & stock: a story')).toBe('gst-invoicing-stock-a-story');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });
});

describe('isPublished', () => {
  it('treats a missing draft flag as published', () => {
    expect(isPublished({})).toBe(true);
  });

  it('excludes drafts', () => {
    expect(isPublished({ draft: true })).toBe(false);
  });
});

describe('byDateDesc', () => {
  it('sorts newest first', () => {
    const entries = [{ date: '2026-01-01' }, { date: '2026-08-26' }, { date: '2026-05-04' }];
    expect(entries.sort(byDateDesc).map((e) => e.date)).toEqual([
      '2026-08-26',
      '2026-05-04',
      '2026-01-01',
    ]);
  });
});

describe('assertEntry', () => {
  const valid = {
    title: 'A post',
    description: 'What it is about.',
    date: '2026-08-26',
    pillar: 'migrations',
  };

  it('accepts a complete entry', () => {
    expect(() => assertEntry(valid, 'content/writing/a.md')).not.toThrow();
  });

  it('names the file and the field when one is missing', () => {
    const { description, ...rest } = valid;
    expect(() => assertEntry(rest, 'content/writing/a.md')).toThrow(
      /content\/writing\/a\.md.*description/,
    );
  });

  it('rejects an unknown pillar', () => {
    expect(() => assertEntry({ ...valid, pillar: 'vibes' }, 'x.md')).toThrow(/pillar.*vibes/);
  });

  it('rejects a non-ISO date', () => {
    expect(() => assertEntry({ ...valid, date: '26/08/2026' }, 'x.md')).toThrow(/date/);
  });
});

describe('buildRssXml', () => {
  const xml = buildRssXml({
    siteUrl: 'https://ravianand1988.github.io',
    title: 'Ravi Anand Kumar',
    description: 'Writing about frontend architecture.',
    items: [
      {
        title: 'Rules & regulations',
        description: 'On GST <rules>.',
        path: '/writing/rules',
        date: '2026-08-26',
      },
    ],
  });

  it('is a well-formed rss document', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });

  it('escapes markup in titles and descriptions', () => {
    expect(xml).toContain('Rules &amp; regulations');
    expect(xml).toContain('On GST &lt;rules&gt;.');
  });

  it('emits absolute links and rfc-822 dates', () => {
    expect(xml).toContain('<link>https://ravianand1988.github.io/writing/rules</link>');
    expect(xml).toContain('<pubDate>Wed, 26 Aug 2026 00:00:00 GMT</pubDate>');
  });
});

describe('buildSitemapXml', () => {
  it('lists every path as an absolute url', () => {
    const xml = buildSitemapXml({
      siteUrl: 'https://ravianand1988.github.io',
      paths: ['/', '/writing', '/writing/rules'],
    });
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('<loc>https://ravianand1988.github.io/</loc>');
    expect(xml).toContain('<loc>https://ravianand1988.github.io/writing/rules</loc>');
  });
});
```

- [ ] **Step 3: Run them to make sure they fail**

Run: `npm run test:tools`
Expected: FAIL — cannot resolve `./content.mjs`.

- [ ] **Step 4: Implement the module**

Create `tools/lib/content.mjs`:

```javascript
export const PILLARS = Object.freeze([
  'ai-engineering',
  'frontend-architecture',
  'migrations',
  'leading-teams',
]);

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isPublished(entry) {
  return entry.draft !== true;
}

export function byDateDesc(a, b) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertEntry(entry, sourcePath) {
  for (const field of ['title', 'description', 'date', 'pillar']) {
    if (!entry[field]) {
      throw new Error(`${sourcePath}: frontmatter is missing required field "${field}"`);
    }
  }
  if (!ISO_DATE.test(entry.date)) {
    throw new Error(`${sourcePath}: date "${entry.date}" is not ISO format (YYYY-MM-DD)`);
  }
  if (!PILLARS.includes(entry.pillar)) {
    throw new Error(
      `${sourcePath}: pillar "${entry.pillar}" is not one of ${PILLARS.join(', ')}`,
    );
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toRfc822(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = DAYS[d.getUTCDay()];
  const date = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  return `${day}, ${date} ${month} ${d.getUTCFullYear()} 00:00:00 GMT`;
}

export function buildRssXml({ siteUrl, title, description, items }) {
  const entries = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${siteUrl}${item.path}</link>
      <guid isPermaLink="true">${siteUrl}${item.path}</guid>
      <pubDate>${toRfc822(item.date)}</pubDate>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${siteUrl}/</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>
`;
}

export function buildSitemapXml({ siteUrl, paths }) {
  const urls = paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:tools`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add the content pipeline's pure functions, with tests

Slugging, draft filtering, date ordering, frontmatter validation, and RSS
and sitemap generation. This is the only real logic on the site, so it is
the only thing with unit tests. Frontmatter validation fails the build with
the offending file and field named, rather than emitting a broken page."
```

---

### Task 4: Content build script

Compiles markdown into generated TypeScript plus RSS and sitemap, wired as `prebuild` so the existing deploy workflow needs no change.

**Files:**
- Create: `tools/build-content.mjs`
- Create: `content/writing/.gitkeep`, `content/projects/.gitkeep`
- Modify: `package.json` (deps, `prebuild` script)
- Modify: `angular.json` (assets entry for generated public files)

**Interfaces:**
- Consumes: everything exported from `tools/lib/content.mjs` (Task 3).
- Produces:
  - `src/generated/content.ts` exporting `posts: GeneratedEntry[]` and `projects: GeneratedEntry[]`, where
    `GeneratedEntry = { slug: string; title: string; description: string; date: string; pillar: string; html: string }`
  - `src/generated/slugs.ts` exporting `writingSlugs: string[]` and `projectSlugs: string[]`
  - `src/generated/public/rss.xml`, `src/generated/public/sitemap.xml`

- [ ] **Step 1: Install the content dependencies**

```bash
npm install --save-dev gray-matter@^4.0.3 marked@^16.0.0 shiki@^3.0.0
```

These are dev dependencies. Nothing from them reaches the browser: highlighting happens at build time and only HTML ships.

- [ ] **Step 2: Create the content directories**

```bash
mkdir -p content/writing content/projects
touch content/writing/.gitkeep content/projects/.gitkeep
```

- [ ] **Step 3: Write the build script**

Create `tools/build-content.mjs`:

```javascript
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { Marked } from 'marked';
import { createHighlighter } from 'shiki';
import {
  slugify,
  isPublished,
  byDateDesc,
  assertEntry,
  buildRssXml,
  buildSitemapXml,
} from './lib/content.mjs';

const SITE_URL = 'https://ravianand1988.github.io';
const SITE_TITLE = 'Ravi Anand Kumar';
const SITE_DESCRIPTION =
  'Writing about frontend architecture, migrations, design systems and AI-assisted engineering.';

const GENERATED_DIR = join('src', 'generated');
const PUBLIC_DIR = join(GENERATED_DIR, 'public');

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['typescript', 'javascript', 'html', 'scss', 'bash', 'json', 'sql', 'csharp'],
});

const marked = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
      return highlighter.codeToHtml(text, {
        lang: language,
        themes: { light: 'github-light', dark: 'github-dark' },
      });
    },
  },
});

async function readCollection(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const entries = [];
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const sourcePath = join(dir, file);
    const raw = await readFile(sourcePath, 'utf8');
    const { data, content } = matter(raw);

    if (!isPublished(data)) continue;
    assertEntry(data, sourcePath);

    entries.push({
      slug: data.slug ? slugify(data.slug) : slugify(file.replace(/\.md$/, '')),
      title: data.title,
      description: data.description,
      date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
      pillar: data.pillar,
      html: await marked.parse(content),
    });
  }

  return entries.sort(byDateDesc);
}

function toTs(name, entries) {
  return `export const ${name}: GeneratedEntry[] = ${JSON.stringify(entries, null, 2)};\n`;
}

const posts = await readCollection(join('content', 'writing'));
const projects = await readCollection(join('content', 'projects'));

await rm(GENERATED_DIR, { recursive: true, force: true });
await mkdir(PUBLIC_DIR, { recursive: true });

await writeFile(
  join(GENERATED_DIR, 'content.ts'),
  `// GENERATED by tools/build-content.mjs. Do not edit; do not commit.
export interface GeneratedEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  pillar: string;
  html: string;
}

${toTs('posts', posts)}
${toTs('projects', projects)}`,
);

await writeFile(
  join(GENERATED_DIR, 'slugs.ts'),
  `// GENERATED by tools/build-content.mjs. Do not edit; do not commit.
export const writingSlugs: string[] = ${JSON.stringify(posts.map((p) => p.slug))};
export const projectSlugs: string[] = ${JSON.stringify(projects.map((p) => p.slug))};
`,
);

await writeFile(
  join(PUBLIC_DIR, 'rss.xml'),
  buildRssXml({
    siteUrl: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    items: posts.map((p) => ({
      title: p.title,
      description: p.description,
      path: `/writing/${p.slug}`,
      date: p.date,
    })),
  }),
);

await writeFile(
  join(PUBLIC_DIR, 'sitemap.xml'),
  buildSitemapXml({
    siteUrl: SITE_URL,
    paths: [
      '/',
      '/writing',
      '/projects',
      '/ai',
      '/about',
      ...posts.map((p) => `/writing/${p.slug}`),
      ...projects.map((p) => `/projects/${p.slug}`),
    ],
  }),
);

console.log(`build-content: ${posts.length} posts, ${projects.length} projects`);
```

- [ ] **Step 4: Wire the hooks and the assets mapping**

Add to `package.json` scripts:

```json
"prebuild": "node tools/build-content.mjs"
```

Run:

```bash
node -e '
const fs=require("fs");const p="angular.json";const d=JSON.parse(fs.readFileSync(p,"utf8"));
const o=d.projects["ravianand1988.github.io"].architect.build.options;
o.assets=["src/favicon.ico","src/assets",
  {glob:"*.woff2",input:"src/fonts",output:"/assets/fonts"},
  {glob:"*.xml",input:"src/generated/public",output:"/"}];
fs.writeFileSync(p, JSON.stringify(d,null,2)+"\n");
console.log(JSON.stringify(o.assets,null,2));
'
```

- [ ] **Step 5: Add a temporary fixture post and run the script**

```bash
cat > content/writing/fixture-check.md <<'MD'
---
title: Fixture check
description: A throwaway post proving the pipeline runs.
date: 2026-08-26
pillar: migrations
---

Body text with `inline code`.

```typescript
const answer: number = 42;
```
MD
node tools/build-content.mjs
```

Expected: `build-content: 1 posts, 0 projects`

- [ ] **Step 6: Verify the generated output**

```bash
ls src/generated src/generated/public
grep -c 'shiki' src/generated/content.ts
grep -o '"slug": "[^"]*"' src/generated/content.ts
grep -o '<title>[^<]*</title>' src/generated/public/rss.xml | head -2
```

Expected: `content.ts`, `slugs.ts` and `public/` exist; the shiki grep returns a count of 1 or more, proving code blocks were highlighted at build time; slug is `fixture-check`; the RSS title is `Ravi Anand Kumar`.

- [ ] **Step 7: Prove frontmatter validation fails the build**

```bash
cat > content/writing/broken.md <<'MD'
---
title: Broken
date: 2026-08-26
pillar: vibes
---
Body.
MD
node tools/build-content.mjs; echo "exit=$?"
rm content/writing/broken.md
```

Expected: a non-zero exit with an error naming `content/writing/broken.md` and the missing `description` field.

- [ ] **Step 8: Remove the fixture and commit**

```bash
rm content/writing/fixture-check.md
git add -A
git commit -m "Compile markdown into generated modules at build time

content/ is now the authoring surface. A prebuild script parses frontmatter,
renders markdown, highlights code with shiki at build time so no highlighter
ships to the browser, and emits generated TypeScript plus rss.xml and
sitemap.xml.

Wired as the npm prebuild hook, so npm run build picks it up and the deploy
workflow needs no change."
```

---

### Task 5: Content and SEO services

**Files:**
- Create: `src/app/core/content.ts`, `src/app/core/content.spec.ts`
- Create: `src/app/core/seo.ts`, `src/app/core/seo.spec.ts`

**Interfaces:**
- Consumes: `posts`, `projects`, `GeneratedEntry` from `src/generated/content.ts` (Task 4).
- Produces:
  - `ContentService` with `allPosts(): GeneratedEntry[]`, `recentPosts(count: number): GeneratedEntry[]`, `postBySlug(slug: string): GeneratedEntry | undefined`, `allProjects(): GeneratedEntry[]`, `projectBySlug(slug: string): GeneratedEntry | undefined`, `postsByPillar(pillar: string | null): GeneratedEntry[]`
  - `Seo` with `set(meta: { title: string; description: string; path: string }): void`
  - `SITE_URL` constant

- [ ] **Step 1: Write the failing tests**

Create `src/app/core/content.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ContentService } from './content';

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentService);
  });

  it('returns posts newest first', () => {
    const dates = service.allPosts().map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('caps recentPosts at the requested count', () => {
    expect(service.recentPosts(2).length).toBeLessThanOrEqual(2);
  });

  it('returns undefined for an unknown slug', () => {
    expect(service.postBySlug('no-such-post')).toBeUndefined();
  });

  it('returns every post when no pillar is selected', () => {
    expect(service.postsByPillar(null).length).toBe(service.allPosts().length);
  });

  it('filters to a single pillar', () => {
    const filtered = service.postsByPillar('migrations');
    expect(filtered.every((p) => p.pillar === 'migrations')).toBe(true);
  });
});
```

Create `src/app/core/seo.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Seo, SITE_URL } from './seo';

describe('Seo', () => {
  let seo: Seo;
  let meta: Meta;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seo = TestBed.inject(Seo);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
  });

  it('sets the document title', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(title.getTitle()).toBe('A post');
  });

  it('sets the description and the open graph pair', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(meta.getTag('name="description"')?.content).toBe('About it.');
    expect(meta.getTag('property="og:title"')?.content).toBe('A post');
    expect(meta.getTag('property="og:description"')?.content).toBe('About it.');
  });

  it('builds an absolute canonical url and og:url', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(meta.getTag('property="og:url"')?.content).toBe(`${SITE_URL}/writing/a-post`);
  });

  it('sets an absolute og:image', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(meta.getTag('property="og:image"')?.content).toBe(`${SITE_URL}/assets/og-default.png`);
  });

  it('overwrites rather than duplicating on a second call', () => {
    seo.set({ title: 'One', description: 'First.', path: '/one' });
    seo.set({ title: 'Two', description: 'Second.', path: '/two' });
    expect(meta.getTags('property="og:title"').length).toBe(1);
    expect(meta.getTag('property="og:title"')?.content).toBe('Two');
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx ng test --no-watch --include='**/core/*.spec.ts'`
Expected: FAIL — `./content` and `./seo` do not exist.

- [ ] **Step 3: Implement ContentService**

Create `src/app/core/content.ts`:

```typescript
import { Injectable } from '@angular/core';
import { GeneratedEntry, posts, projects } from '../../generated/content';

@Injectable({ providedIn: 'root' })
export class ContentService {
  allPosts(): GeneratedEntry[] {
    return posts;
  }

  recentPosts(count: number): GeneratedEntry[] {
    return posts.slice(0, count);
  }

  postBySlug(slug: string): GeneratedEntry | undefined {
    return posts.find((post) => post.slug === slug);
  }

  postsByPillar(pillar: string | null): GeneratedEntry[] {
    return pillar ? posts.filter((post) => post.pillar === pillar) : posts;
  }

  allProjects(): GeneratedEntry[] {
    return projects;
  }

  projectBySlug(slug: string): GeneratedEntry | undefined {
    return projects.find((project) => project.slug === slug);
  }
}
```

- [ ] **Step 4: Implement Seo**

Create `src/app/core/seo.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const SITE_URL = 'https://ravianand1988.github.io';
const OG_IMAGE = `${SITE_URL}/assets/og-default.png`;

export interface PageMeta {
  title: string;
  description: string;
  path: string;
}

@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set({ title, description, path }: PageMeta): void {
    const url = `${SITE_URL}${path}`;
    this.title.setTitle(title);

    // updateTag overwrites a matching tag rather than appending, which keeps
    // prerendered pages from accumulating duplicates across navigations.
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test --no-watch --include='**/core/*.spec.ts'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add content lookup and per-page metadata services

ContentService reads the generated modules; Seo sets the title, description
and Open Graph tags that prerendering then bakes into each static file.
updateTag rather than addTag, so a client-side navigation replaces the tags
instead of stacking duplicates."
```

---

### Task 6: Site header and footer

**Files:**
- Create: `src/app/layout/site-header/site-header.component.ts`, `.html`, `.scss`
- Create: `src/app/layout/site-footer/site-footer.component.ts`, `.html`, `.scss`
- Create: `src/app/layout/site-header/site-header.component.spec.ts`
- Modify: `src/app/app.component.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SiteHeaderComponent` (selector `app-site-header`), `SiteFooterComponent` (selector `app-site-footer`).

- [ ] **Step 1: Write the failing nav test**

Create `src/app/layout/site-header/site-header.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeaderComponent } from './site-header.component';
import { routes } from '../../app.routes';

describe('SiteHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('lists exactly the four output destinations', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.links a'),
    ).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Writing', 'Projects', 'Building with AI', 'About']);
  });

  it('does not link to a skills or contact page', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).not.toContain('Skills');
    expect(html).not.toContain('Contact');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx ng test --no-watch --include='**/site-header.component.spec.ts'`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the header**

Create `src/app/layout/site-header/site-header.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {}
```

Create `src/app/layout/site-header/site-header.component.html`:

```html
<header class="site-header">
  <a routerLink="/" class="brand">Ravi Anand Kumar</a>
  <nav class="links">
    <a routerLink="/writing" routerLinkActive="on">Writing</a>
    <a routerLink="/projects" routerLinkActive="on">Projects</a>
    <a routerLink="/ai" routerLinkActive="on">Building with AI</a>
    <a routerLink="/about" routerLinkActive="on">About</a>
  </nav>
</header>
```

Create `src/app/layout/site-header/site-header.component.scss`:

```scss
.site-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  max-width: 74ch;
  margin: 0 auto;
  padding: var(--space-3) var(--space-3) 0;
  border-bottom: 1px solid var(--rule);
  padding-bottom: var(--space-2);
}

.brand {
  font-family: var(--font-display);
  font-size: var(--step-1);
  color: var(--ink);
  text-decoration: none;
  margin-right: auto;
}

.links {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.links a {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--ink-subtle);
  text-decoration: none;
}

.links a.on,
.links a:hover {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 4px;
}

@media (max-width: 640px) {
  .site-header {
    flex-direction: column;
    gap: var(--space-2);
  }
  .brand {
    margin-right: 0;
  }
}
```

- [ ] **Step 4: Implement the footer**

Create `src/app/layout/site-footer/site-footer.component.ts`:

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {}
```

Create `src/app/layout/site-footer/site-footer.component.html`:

```html
<footer class="site-footer">
  <p class="eyebrow">Contact</p>
  <ul class="links">
    <li><a href="mailto:ravianand1988@live.com">ravianand1988&#64;live.com</a></li>
    <li>
      <a href="https://www.linkedin.com/in/ravianandkumar/" target="_blank" rel="noopener">LinkedIn</a>
    </li>
    <li><a href="https://github.com/ravianand1988" target="_blank" rel="noopener">GitHub</a></li>
    <li>
      <a href="https://stackoverflow.com/users/2444505/ravi-anand" target="_blank" rel="noopener">Stack Overflow</a>
    </li>
    <li><a href="/rss.xml">RSS</a></li>
  </ul>
</footer>
```

Create `src/app/layout/site-footer/site-footer.component.scss`:

```scss
.site-footer {
  max-width: 74ch;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3) var(--space-4);
  border-top: 1px solid var(--rule);
}

.links {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 0.82rem;
}
```

- [ ] **Step 5: Put them in the shell**

Replace `src/app/app.component.ts`:

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';
import { SiteFooterComponent } from './layout/site-footer/site-footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <app-site-header />
    <router-outlet />
    <app-site-footer />
  `,
})
export class AppComponent {}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --no-watch`
Expected: PASS, including the Task 1 shell test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add the site header and footer

Nav lists four outputs, Writing, Projects, Building with AI and About,
rather than resume headings. A test pins that list and fails if Skills or
Contact reappear. Contact details move into the footer on every page."
```

---

### Task 7: Writing routes

**Files:**
- Create: `src/app/pages/writing-index/writing-index.component.ts`, `.html`, `.scss`
- Create: `src/app/pages/writing-post/writing-post.component.ts`, `.html`
- Create: `src/app/pages/writing-post/writing-post.component.spec.ts`
- Modify: `src/app/app.routes.ts`, `src/app/app.routes.server.ts`

**Interfaces:**
- Consumes: `ContentService`, `Seo` (Task 5); `writingSlugs` from `src/generated/slugs.ts` (Task 4).
- Produces: routes `/writing` and `/writing/:slug`; `serverRoutes` entry with `getPrerenderParams` for `writing/:slug`.

- [ ] **Step 1: Write the failing post-page test**

Create `src/app/pages/writing-post/writing-post.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { WritingPostComponent } from './writing-post.component';
import { ContentService } from '../../core/content';

describe('WritingPostComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'writing/:slug', component: WritingPostComponent }]),
      ],
    }).compileComponents();
  });

  it('renders the post body and sets the document title from the post', async () => {
    const content = TestBed.inject(ContentService);
    const post = content.allPosts()[0];
    if (!post) {
      // No posts authored yet (Task 12 adds them). The route still has to resolve.
      const harness = await RouterTestingHarness.create('/writing/anything');
      expect(harness.routeNativeElement?.textContent).toContain('not here');
      return;
    }

    const harness = await RouterTestingHarness.create(`/writing/${post.slug}`);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(post.title);
    expect(TestBed.inject(Title).getTitle()).toBe(post.title);
  });

  it('shows a not-found message for an unknown slug', async () => {
    const harness = await RouterTestingHarness.create('/writing/definitely-not-a-post');
    expect(harness.routeNativeElement?.textContent).toContain('not here');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx ng test --no-watch --include='**/writing-post.component.spec.ts'`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the post page**

Create `src/app/pages/writing-post/writing-post.component.ts`:

```typescript
import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-writing-post',
  imports: [DatePipe],
  templateUrl: './writing-post.component.html',
})
export class WritingPostComponent {
  readonly slug = input.required<string>();

  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(Seo);

  readonly post = computed(() => {
    const found = this.content.postBySlug(this.slug());
    if (found) {
      this.seo.set({
        title: found.title,
        description: found.description,
        path: `/writing/${found.slug}`,
      });
    }
    return found;
  });

  // The body is first-party markdown compiled at build time. There is no
  // user-input path into it. Angular's sanitizer strips the inline styles
  // Shiki emits for code blocks, which would leave highlighting unstyled, so
  // the trusted-HTML bypass is deliberate here and safe for this content only.
  readonly body = computed(() => {
    const post = this.post();
    return post ? this.sanitizer.bypassSecurityTrustHtml(post.html) : null;
  });
}
```

Create `src/app/pages/writing-post/writing-post.component.html`:

```html
@if (post(); as entry) {
  <main class="wrap">
    <p class="eyebrow">{{ entry.pillar }} · {{ entry.date | date: 'MMMM y' }}</p>
    <h1>{{ entry.title }}</h1>
    <hr class="rule" />
    <article class="prose" [innerHTML]="body()"></article>
  </main>
} @else {
  <main class="wrap">
    <p class="eyebrow">404</p>
    <h1>That post is not here.</h1>
    <p><a href="/writing">See everything I have written</a></p>
  </main>
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --no-watch --include='**/writing-post.component.spec.ts'`
Expected: PASS

- [ ] **Step 5: Implement the writing index**

Create `src/app/pages/writing-index/writing-index.component.ts`:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

const PILLARS = ['ai-engineering', 'frontend-architecture', 'migrations', 'leading-teams'] as const;

@Component({
  selector: 'app-writing-index',
  imports: [RouterLink, DatePipe],
  templateUrl: './writing-index.component.html',
  styleUrl: './writing-index.component.scss',
})
export class WritingIndexComponent {
  private readonly content = inject(ContentService);

  readonly pillars = PILLARS;
  readonly active = signal<string | null>(null);
  readonly posts = computed(() => this.content.postsByPillar(this.active()));

  constructor() {
    inject(Seo).set({
      title: 'Writing, Ravi Anand Kumar',
      description:
        'Essays on frontend architecture, migrations, design systems and AI-assisted engineering.',
      path: '/writing',
    });
  }

  select(pillar: string | null): void {
    this.active.set(this.active() === pillar ? null : pillar);
  }
}
```

Create `src/app/pages/writing-index/writing-index.component.html`:

```html
<main class="wrap">
  <p class="eyebrow">Writing</p>
  <h1>Notes from inside the work.</h1>

  <div class="filters">
    @for (pillar of pillars; track pillar) {
      <button type="button" [class.on]="active() === pillar" (click)="select(pillar)">
        {{ pillar }}
      </button>
    }
  </div>

  <hr class="rule" />

  @for (post of posts(); track post.slug) {
    <div class="row">
      <a class="row-title" [routerLink]="['/writing', post.slug]">{{ post.title }}</a>
      <span class="row-desc">{{ post.description }}</span>
      <span class="row-meta">{{ post.date | date: 'MMM y' }}</span>
    </div>
  } @empty {
    <p>Nothing published under that filter yet.</p>
  }
</main>
```

Create `src/app/pages/writing-index/writing-index.component.scss`:

```scss
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.filters button {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  color: var(--ink-subtle);
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
}

.filters button.on {
  color: var(--paper);
  background: var(--accent);
  border-color: var(--accent);
}

.row-title {
  font-weight: 500;
  min-width: 18ch;
  color: var(--ink);
  text-decoration: none;
}

.row-title:hover {
  color: var(--accent);
}

.row-desc {
  color: var(--ink-subtle);
  font-size: var(--step--1);
}
```

- [ ] **Step 6: Register the routes**

Replace `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Ravi Anand Kumar, Frontend Tech Lead',
  },
  {
    path: 'writing',
    loadComponent: () =>
      import('./pages/writing-index/writing-index.component').then((m) => m.WritingIndexComponent),
  },
  {
    path: 'writing/:slug',
    loadComponent: () =>
      import('./pages/writing-post/writing-post.component').then((m) => m.WritingPostComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found',
  },
];
```

Replace `src/app/app.routes.server.ts`:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';
import { writingSlugs } from '../generated/slugs';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'writing/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return writingSlugs.map((slug) => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

- [ ] **Step 7: Prove per-slug prerendering with a temporary post**

```bash
cat > content/writing/prerender-proof.md <<'MD'
---
title: Prerender proof
description: A throwaway post proving per-slug HTML gets emitted.
date: 2026-08-26
pillar: migrations
---

Body.
MD
npm run build
ls dist/ravianand1988.github.io/browser/writing/prerender-proof/index.html
grep -o '<title>[^<]*</title>' dist/ravianand1988.github.io/browser/writing/prerender-proof/index.html
grep -o '<meta property="og:url" content="[^"]*"' dist/ravianand1988.github.io/browser/writing/prerender-proof/index.html
rm content/writing/prerender-proof.md
```

Expected: the file exists, its title is `<title>Prerender proof</title>`, and `og:url` is the absolute post URL. This is the proof that `getPrerenderParams` drives route enumeration.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add the writing index and post pages

Per-slug pages are enumerated by getPrerenderParams reading the generated
slug module, so every post becomes its own static file carrying its own
title and Open Graph tags.

Post bodies use the trusted-HTML bypass deliberately: the markdown is
first-party and compiled at build time, and Angular's sanitizer would
otherwise strip the inline styles Shiki emits for code blocks."
```

---

### Task 8: Projects routes

**Files:**
- Create: `src/app/pages/projects-index/projects-index.component.ts`, `.html`
- Create: `src/app/pages/project-detail/project-detail.component.ts`, `.html`
- Create: `src/app/pages/project-detail/project-detail.component.spec.ts`
- Modify: `src/app/app.routes.ts`, `src/app/app.routes.server.ts`

**Interfaces:**
- Consumes: `ContentService`, `Seo` (Task 5); `projectSlugs` from `src/generated/slugs.ts` (Task 4).
- Produces: routes `/projects` and `/projects/:slug`; a second `getPrerenderParams` entry in `serverRoutes`.

- [ ] **Step 1: Write the failing test**

Create `src/app/pages/project-detail/project-detail.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProjectDetailComponent } from './project-detail.component';

describe('ProjectDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'projects/:slug', component: ProjectDetailComponent }]),
      ],
    }).compileComponents();
  });

  it('shows a not-found message for an unknown slug', async () => {
    const harness = await RouterTestingHarness.create('/projects/definitely-not-a-project');
    expect(harness.routeNativeElement?.textContent).toContain('not here');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx ng test --no-watch --include='**/project-detail.component.spec.ts'`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the detail page**

Create `src/app/pages/project-detail/project-detail.component.ts`:

```typescript
import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent {
  readonly slug = input.required<string>();

  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(Seo);

  readonly project = computed(() => {
    const found = this.content.projectBySlug(this.slug());
    if (found) {
      this.seo.set({
        title: found.title,
        description: found.description,
        path: `/projects/${found.slug}`,
      });
    }
    return found;
  });

  // Same rationale as WritingPostComponent: first-party markdown compiled at
  // build time, no user-input path, and the sanitizer would strip Shiki's
  // inline styles.
  readonly body = computed(() => {
    const project = this.project();
    return project ? this.sanitizer.bypassSecurityTrustHtml(project.html) : null;
  });
}
```

Create `src/app/pages/project-detail/project-detail.component.html`:

```html
@if (project(); as entry) {
  <main class="wrap">
    <p class="eyebrow">{{ entry.pillar }}</p>
    <h1>{{ entry.title }}</h1>
    <hr class="rule" />
    <article class="prose" [innerHTML]="body()"></article>
  </main>
} @else {
  <main class="wrap">
    <p class="eyebrow">404</p>
    <h1>That project is not here.</h1>
    <p><a href="/projects">See selected work</a></p>
  </main>
}
```

- [ ] **Step 4: Implement the projects index**

Create `src/app/pages/projects-index/projects-index.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-projects-index',
  imports: [RouterLink],
  templateUrl: './projects-index.component.html',
})
export class ProjectsIndexComponent {
  private readonly content = inject(ContentService);
  readonly projects = this.content.allProjects();

  constructor() {
    inject(Seo).set({
      title: 'Projects, Ravi Anand Kumar',
      description: 'Selected work: what it was, what I decided, and what shipped.',
      path: '/projects',
    });
  }
}
```

Create `src/app/pages/projects-index/projects-index.component.html`:

```html
<main class="wrap">
  <p class="eyebrow">Projects</p>
  <h1>Selected work.</h1>
  <hr class="rule" />

  @for (project of projects; track project.slug) {
    <div class="row">
      <a [routerLink]="['/projects', project.slug]">{{ project.title }}</a>
      <span>{{ project.description }}</span>
    </div>
  } @empty {
    <p>Nothing here yet.</p>
  }
</main>
```

- [ ] **Step 5: Register the routes**

In `src/app/app.routes.ts`, insert these two entries after the `writing/:slug` entry and before the `**` entry:

```typescript
  {
    path: 'projects',
    loadComponent: () =>
      import('./pages/projects-index/projects-index.component').then((m) => m.ProjectsIndexComponent),
  },
  {
    path: 'projects/:slug',
    loadComponent: () =>
      import('./pages/project-detail/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
```

Replace `src/app/app.routes.server.ts`:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';
import { projectSlugs, writingSlugs } from '../generated/slugs';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'writing/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return writingSlugs.map((slug) => ({ slug }));
    },
  },
  {
    path: 'projects/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return projectSlugs.map((slug) => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

- [ ] **Step 6: Run the tests and build**

Run: `npx ng test --no-watch && npm run build`
Expected: tests PASS; build succeeds and prerenders `/projects` alongside the existing routes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add the projects index and case study pages

Case studies are markdown like posts, so a project gets the same per-slug
prerendering and metadata treatment. Replaces the four-card projects grid
and its Repository private for now notes."
```

---

### Task 9: Homepage

**Files:**
- Create: `src/app/pages/home/home.component.ts`, `.html`, `.scss`
- Create: `src/app/pages/home/home.component.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ContentService`, `Seo` (Task 5).
- Produces: the `/` route component.

- [ ] **Step 1: Write the failing test**

Create `src/app/pages/home/home.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('leads with the through-line', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('outgrown their structure');
  });

  it('shows at most three selected work items', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.work .row');
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('states availability as a sentence, not a pill, and omits visa detail', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.availability')?.tagName).toBe('P');
    expect(el.textContent).not.toContain('sponsorship');
    expect(el.querySelector('.tag')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx ng test --no-watch --include='**/home.component.spec.ts'`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the homepage**

Create `src/app/pages/home/home.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly content = inject(ContentService);

  readonly work = this.content.allProjects().slice(0, 3);
  readonly recent = this.content.recentPosts(3);

  constructor() {
    inject(Seo).set({
      title: 'Ravi Anand Kumar, Frontend Tech Lead',
      description:
        'I take frontends that have outgrown their structure and make them workable again. Frontend Tech Lead in Berlin.',
      path: '/',
    });
  }
}
```

Create `src/app/pages/home/home.component.html`:

```html
<main class="wrap">
  <p class="eyebrow">Frontend Tech Lead · Berlin</p>

  <h1>I take frontends that have outgrown their structure and make them <em>workable again</em>.</h1>

  <p class="support">
    Shared design systems instead of copy-paste. Migrations that ship while the business keeps
    running. AI tooling a team actually uses every day.
  </p>

  <p class="availability">
    Looking for my next frontend lead role in Berlin, or remote within the DACH region.
  </p>

  <hr class="rule" />

  <section class="work">
    <p class="eyebrow">Selected work</p>
    @for (project of work; track project.slug) {
      <div class="row">
        <a class="row-title" [routerLink]="['/projects', project.slug]">{{ project.title }}</a>
        <span class="row-desc">{{ project.description }}</span>
      </div>
    } @empty {
      <p>Case studies are being written.</p>
    }
  </section>

  <hr class="rule" />

  <section class="writing">
    <p class="eyebrow">Recent writing</p>
    @for (post of recent; track post.slug) {
      <div class="row">
        <a class="row-title" [routerLink]="['/writing', post.slug]">{{ post.title }}</a>
        <span class="row-desc">{{ post.pillar }}</span>
        <span class="row-meta">{{ post.date | date: 'MMM y' }}</span>
      </div>
    } @empty {
      <p>First posts are on their way.</p>
    }
    <p class="more"><a routerLink="/writing">Everything I have written</a></p>
  </section>

  <hr class="rule" />

  <section class="ai">
    <p class="eyebrow">Building with AI</p>
    <p>
      I wrote a Claude Code plugin suite my engineering team used every day, for ticket refinement,
      implementation planning, PR review and database migrations. Not demos. Things a real team kept
      using.
    </p>
    <p class="more"><a routerLink="/ai">How it works, and how to use it</a></p>
  </section>

  <hr class="rule" />

  <section class="career">
    <p class="eyebrow">The short version</p>
    <p>
      I started on intranet line-of-business apps in C# and ASP.NET MVC, spent two years building a
      healthcare platform on Django and Vue from inception to production, then seven years at byrd
      technologies in Berlin, where I was promoted to Frontend Tech Lead and owned the design system
      and frontend architecture behind a B2B logistics platform. The thread through all of it is the
      same: take something that has grown messy and make it workable for the people who have to
      live in it.
    </p>
    <p class="more"><a routerLink="/about">More about me</a></p>
  </section>
</main>
```

Create `src/app/pages/home/home.component.scss`:

```scss
h1 em {
  font-style: italic;
  color: var(--accent);
}

.support {
  max-width: 52ch;
  color: var(--ink-muted);
  margin-top: var(--space-3);
}

.availability {
  margin-top: var(--space-3);
  padding-left: var(--space-1);
  border-left: 2px solid var(--brass);
  color: var(--accent);
  font-size: var(--step--1);
}

.row-title {
  font-weight: 500;
  min-width: 18ch;
  color: var(--ink);
  text-decoration: none;
}

.row-title:hover {
  color: var(--accent);
}

.row-desc {
  color: var(--ink-subtle);
  font-size: var(--step--1);
}

.more {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  margin-top: var(--space-2);
}

section p {
  max-width: var(--measure-prose);
  color: var(--ink-muted);
}
```

- [ ] **Step 4: Point `/` at it**

In `src/app/app.routes.ts`, replace the `path: ''` entry with:

```typescript
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
```

The `title` property is removed because `Seo` now owns the title for this route.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx ng test --no-watch --include='**/home.component.spec.ts'`
Expected: PASS

- [ ] **Step 6: Verify the career paragraph against the spec before moving on**

The paragraph in Step 3 asserts "seven years at byrd technologies" and "two years building a healthcare platform". Check these against the existing site copy that the spec preserves: byrd was Oct 2019 to Jul 2026, Assistr was Sep 2017 to Oct 2019. Both hold. If either does not, fix the copy rather than the dates.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add the homepage

Leads with the through-line rather than a year-count, caps selected work at
three items, and states availability as one sentence instead of two pills.
The visa detail moves off the front page. Career history becomes a single
narrative paragraph instead of a thirteen-bullet list.

Tests pin the three things most likely to drift back: the through-line in
the h1, the three-item cap, and availability not becoming a tag again."
```

---

### Task 10: Building with AI, and About

**Files:**
- Create: `src/app/pages/ai/ai.component.ts`, `.html`
- Create: `src/app/pages/about/about.component.ts`, `.html`, `.scss`
- Create: `src/app/pages/about/about.component.spec.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `Seo` (Task 5).
- Produces: the `/ai` and `/about` route components.

- [ ] **Step 1: Write the failing about-page test**

Create `src/app/pages/about/about.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
    }).compileComponents();
  });

  it('keeps byrd to at most four bullets', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const bullets = (fixture.nativeElement as HTMLElement).querySelectorAll('.role-byrd li');
    expect(bullets.length).toBeLessThanOrEqual(4);
  });

  it('has no skills tag cloud', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Jira');
    expect(el.querySelector('.tag')).toBeNull();
  });

  it('links the CV', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const cv = (fixture.nativeElement as HTMLElement).querySelector('a[download]');
    expect(cv?.getAttribute('href')).toContain('Ravi_Anand_Kumar_CV');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx ng test --no-watch --include='**/about.component.spec.ts'`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the about page**

Create `src/app/pages/about/about.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  constructor() {
    inject(Seo).set({
      title: 'About Ravi Anand Kumar',
      description:
        'Frontend Tech Lead in Berlin. Twelve years in software, the last seven in frontend architecture.',
      path: '/about',
    });
  }
}
```

Create `src/app/pages/about/about.component.html`:

```html
<main class="wrap">
  <p class="eyebrow">About</p>
  <h1>Twelve years in software, seven of them making frontends behave.</h1>

  <div class="prose">
    <p>
      I am a Frontend Tech Lead in Berlin. Angular, TypeScript, RxJS and NgRx day to day, on top of
      earlier full-stack work in C# and .NET, Python and Django, Vue, and Java and Kotlin. I care
      about component-driven architecture and design systems as much as I care about hiring, code
      review and CI/CD, because in my experience the second list is what decides whether the first
      one survives contact with a real team.
    </p>

    <h2>byrd technologies, Berlin</h2>
    <p class="role-meta">Frontend Tech Lead, previously Senior Frontend Engineer. Oct 2019 to Jul 2026.</p>
    <ul class="role-byrd">
      <li>
        Promoted to Frontend Tech Lead in Aug 2024, leading frontend architecture for a B2B
        logistics platform across Partner, Customer and Admin dashboards.
      </li>
      <li>
        Owned and published federkleid, the shared Angular design system, plus a suite of internal
        libraries consumed by all three dashboards, on a regular versioned release cadence.
      </li>
      <li>
        Moved domain state out of per-app code into shared versioned packages, and kept the codebase
        current through five consecutive major Angular upgrades.
      </li>
      <li>
        Interviewed, hired and mentored a team of four to six engineers, and owned the CI/CD
        pipelines behind their releases.
      </li>
    </ul>

    <h2>Assistr Digital Health Systems, Berlin</h2>
    <p class="role-meta">Software Developer. Sep 2017 to Oct 2019.</p>
    <p>
      Joined a healthcare platform for elderly and assisted living at inception and owned delivery
      from early research through to production: REST services and admin panels on Django and
      PostgreSQL, and the Vue frontend built test-first with Jest.
    </p>

    <h2>AppFlow Solutions, Faridabad</h2>
    <p class="role-meta">Software Engineer. Aug 2015 to Sep 2017.</p>
    <p>
      Built an intranet data-input application for a US hospitality client in C# on ASP.NET MVC,
      including its profit and loss module, Azure AD authentication, and an automated file pipeline
      on Azure Logic Apps and Functions.
    </p>

    <h2>Practicalities</h2>
    <p>
      Based in Berlin. Hindi native, English fluent, German at B1. I hold permanent residence, so
      there is no visa sponsorship to arrange.
    </p>

    <p>
      <a href="/assets/Ravi_Anand_Kumar_CV.pdf" download>Download my CV</a>
    </p>
  </div>
</main>
```

Create `src/app/pages/about/about.component.scss`:

```scss
.role-meta {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--meta);
  margin-top: 0;
}

.role-byrd {
  padding-left: 1.1rem;
}

.role-byrd li + li {
  margin-top: var(--space-1);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --no-watch --include='**/about.component.spec.ts'`
Expected: PASS

- [ ] **Step 5: Implement the Building with AI page**

Create `src/app/pages/ai/ai.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-ai',
  templateUrl: './ai.component.html',
})
export class AiComponent {
  constructor() {
    inject(Seo).set({
      title: 'Building with AI, Ravi Anand Kumar',
      description:
        'A Claude Code plugin suite a real engineering team used daily, for ticket refinement, implementation planning, PR review and database migrations.',
      path: '/ai',
    });
  }
}
```

Create `src/app/pages/ai/ai.component.html`:

```html
<main class="wrap">
  <p class="eyebrow">Building with AI</p>
  <h1>Tooling a team kept using.</h1>

  <div class="prose">
    <p>
      Most AI engineering stories are demos. This one is a plugin suite I wrote and maintained that
      my team at byrd used every working day, because it did the parts of the job everyone was doing
      inconsistently by hand.
    </p>

    <h2>What is in it</h2>
    <ul>
      <li><strong>Ticket refinement.</strong> Turns a vague ticket into a specification with scope and acceptance criteria.</li>
      <li><strong>Implementation planning.</strong> Reads the affected repositories and produces a step-by-step plan before any code is written.</li>
      <li><strong>PR creation and review.</strong> Fills the repository's own template, and reviews changes against our standards.</li>
      <li><strong>Database migrations.</strong> Creates and verifies migrations against our conventions.</li>
      <li><strong>Branch naming and release publishing.</strong> The small conventions nobody remembers.</li>
    </ul>

    <h2>Why it worked</h2>
    <p>
      Because each skill encodes a decision the team had already made and kept re-litigating. The
      value was never the model. It was writing down how we work, in a form the tooling could apply
      consistently.
    </p>

    <p>
      A clean-room version, written from scratch and free of anything employer-specific, is on its
      way here. This page will carry it, with installation instructions, when it lands.
    </p>
  </div>
</main>
```

- [ ] **Step 6: Register both routes**

In `src/app/app.routes.ts`, insert before the `**` entry:

```typescript
  {
    path: 'ai',
    loadComponent: () => import('./pages/ai/ai.component').then((m) => m.AiComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
```

- [ ] **Step 7: Add the CV asset**

```bash
ls src/assets/Ravi_Anand_Kumar_CV.pdf 2>/dev/null \
  || echo "MISSING: export Ravi_Anand_Kumar_CV_updated.docx to PDF and save it as src/assets/Ravi_Anand_Kumar_CV.pdf"
```

If missing, stop and ask Ravi to confirm which docx is the current master and export it. Do not link a file that does not exist, and do not invent a CV.

- [ ] **Step 8: Run all tests and build**

Run: `npx ng test --no-watch && npm run build`
Expected: tests PASS; the build prerenders `/`, `/writing`, `/projects`, `/ai`, `/about` and `404.html`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add the Building with AI and About pages

Building with AI is a toolkit page rather than a blog category, so the
sharpest differentiator is a destination instead of a buried paragraph.

About cuts byrd from thirteen bullets to four, deletes the skills tag
cloud, and folds contact into the footer. Work authorization moves here,
where it answers a question, instead of leading the homepage. Tests pin the
four-bullet cap and fail if a tag cloud reappears."
```

---

### Task 11: Build verification in CI

Proves the SSG claim on every push rather than assuming it.

**Files:**
- Create: `tools/verify-build.mjs`
- Modify: `package.json` (chain into `postbuild`)

**Interfaces:**
- Consumes: the built output in `dist/ravianand1988.github.io/browser`, and `src/generated/slugs.ts` (Task 4).
- Produces: a non-zero exit when the built site fails any structural guarantee.

- [ ] **Step 1: Write the verification script**

Create `tools/verify-build.mjs`:

```javascript
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { writingSlugs, projectSlugs } from '../src/generated/slugs.ts';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');
const failures = [];

async function html(...segments) {
  return readFile(join(BROWSER_DIR, ...segments), 'utf8');
}

function titleOf(markup) {
  return markup.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
}

// Every static route must exist as its own file.
for (const route of ['', 'writing', 'projects', 'ai', 'about']) {
  const path = route ? [route, 'index.html'] : ['index.html'];
  try {
    await access(join(BROWSER_DIR, ...path));
  } catch {
    failures.push(`missing prerendered route: /${route}`);
  }
}

// The 404 fallback must be the CSR shell, not the prerendered homepage.
try {
  const [notFound, home] = await Promise.all([html('404.html'), html('index.html')]);
  if (notFound === home) failures.push('404.html is a copy of the prerendered index.html');
  if (!notFound.includes('<app-root')) failures.push('404.html does not contain the app root');
} catch {
  failures.push('404.html is missing');
}

// Each entry gets its own file, with its own title and absolute og:url.
const checks = [
  ...writingSlugs.map((slug) => ['writing', slug]),
  ...projectSlugs.map((slug) => ['projects', slug]),
];

for (const [collection, slug] of checks) {
  let markup;
  try {
    markup = await html(collection, slug, 'index.html');
  } catch {
    failures.push(`missing prerendered page: /${collection}/${slug}`);
    continue;
  }

  const title = titleOf(markup);
  if (!title || title === titleOf(await html('index.html'))) {
    failures.push(`/${collection}/${slug} does not carry its own <title> (got "${title}")`);
  }
  if (!markup.includes(`content="https://ravianand1988.github.io/${collection}/${slug}"`)) {
    failures.push(`/${collection}/${slug} is missing an absolute og:url`);
  }
  if (!markup.includes('property="og:image"')) {
    failures.push(`/${collection}/${slug} is missing og:image`);
  }
}

// The feeds must be at the site root, not under /assets.
for (const file of ['rss.xml', 'sitemap.xml']) {
  try {
    await access(join(BROWSER_DIR, file));
  } catch {
    failures.push(`missing ${file} at the site root`);
  }
}

if (failures.length) {
  console.error('verify-build FAILED:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `verify-build: 5 static routes, ${writingSlugs.length} posts, ${projectSlugs.length} projects, 404 fallback, rss.xml and sitemap.xml all present with per-page metadata`,
);
```

- [ ] **Step 2: Chain it into the postbuild hook**

In `package.json`, set:

```json
"postbuild": "node tools/postbuild.mjs && node tools/verify-styles.mjs && node tools/verify-build.mjs"
```

Because `postbuild` runs automatically after `npm run build`, and the deploy workflow already runs `npm run build`, CI gets this check with no workflow edit.

- [ ] **Step 3: Confirm the script can import the generated TypeScript**

Run: `node tools/verify-build.mjs`

Node 20 cannot import a `.ts` file directly. Expected: FAIL with a module-resolution or unknown-extension error.

Fix by having the build script emit a JSON sidecar the verifier can read. Add to the end of `tools/build-content.mjs`, before the final `console.log`:

```javascript
await writeFile(
  join(GENERATED_DIR, 'slugs.json'),
  JSON.stringify({ writingSlugs: posts.map((p) => p.slug), projectSlugs: projects.map((p) => p.slug) }, null, 2),
);
```

Then replace the import at the top of `tools/verify-build.mjs` with:

```javascript
import { readFile as readJson } from 'node:fs/promises';
const { writingSlugs, projectSlugs } = JSON.parse(
  await readJson(join('src', 'generated', 'slugs.json'), 'utf8'),
);
```

Move that block below the `BROWSER_DIR` declaration so `join` is defined before use.

- [ ] **Step 4: Run the full build and verify**

Run: `npm run build`
Expected: `verify-build: 5 static routes, 0 posts, 0 projects, 404 fallback, rss.xml and sitemap.xml all present with per-page metadata`

- [ ] **Step 5: Prove the verifier actually fails**

```bash
rm dist/ravianand1988.github.io/browser/404.html
node tools/verify-build.mjs; echo "exit=$?"
```

Expected: non-zero exit, with `404.html is missing` listed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Verify the built site on every build

Asserts that each route is a real file, that 404.html is the CSR shell and
not a copy of the prerendered homepage, that every post and project page
carries its own title and absolute og:url, and that the feeds sit at the
site root. Runs in the postbuild hook, so CI checks it with no workflow
change.

The verifier reads a generated JSON sidecar rather than the TypeScript slug
module, because Node 20 cannot import .ts directly."
```

---

### Task 12: Author the content

**Gated.** Do not start this task until Ravi has confirmed the three outstanding accuracy items and sat down for the post sessions. Everything before this task is structure; this task is claims, and the content accuracy rule binds hardest here.

**Files:**
- Create: `content/projects/distribution-erp.md`
- Create: `content/projects/gerber-viewer.md`
- Create: `content/projects/byrd-design-system.md`
- Create: `content/writing/<slug>.md` (two posts)
- Create: `src/assets/og-default.png`
- Delete: `content/writing/.gitkeep`, `content/projects/.gitkeep`

**Interfaces:**
- Consumes: the frontmatter contract from Task 4 (`title`, `description`, `date`, `pillar`, optional `draft`, optional `slug`).
- Produces: the content that every page above renders.

- [ ] **Step 1: Confirm the three unresolved claims with Ravi**

Ask, and do not proceed on any of them without an answer:

1. The Selenium end-to-end coverage claim. It is currently published and unverified.
2. "500+ customers."
3. "100,000+ orders/month."

Any claim he cannot stand behind gets cut, not softened. Under the new IA these move from bullet nine to near the top of a page.

- [ ] **Step 2: Write the ERP case study**

Create `content/projects/distribution-erp.md` with frontmatter:

```yaml
---
title: 'Distribution ERP: Windows Forms to web'
description: 'Replacing a desktop app that ran an FMCG wholesale distributor since 2017, module by module, without the business stopping.'
date: 2026-08-26
pillar: migrations
---
```

Body follows the seven-point outline in the spec's "Case study outline" section, using only the facts in the spec's "Verified project facts" section. The two decisions to lead with: the database sequencing constraint with its rejected change-data-capture alternative, and staying in C# so `decimal` money math and the GST rules ported rather than being re-derived. State plainly that the desktop app is retired and the web app is the system of record.

- [ ] **Step 3: Write the remaining two project entries**

`content/projects/gerber-viewer.md`, pillar `frontend-architecture`: the RS-274X parser with a shared core across a .NET library, a WPF shell and an Angular canvas renderer. Note that the embedded live demo arrives in Phase 2; do not promise it as though it exists.

`content/projects/byrd-design-system.md`, pillar `frontend-architecture`: owning and publishing federkleid and the internal library suite across three dashboards, and moving domain state into shared versioned packages. Only claims already on the current site or in the spec.

- [ ] **Step 4: Write the two launch posts**

Post one is the ERP migration, pillar `migrations`. Post two is the AI tooling, pillar `ai-engineering`.

These come out of working sessions with Ravi, not from his bullet list. Do not draft them from the CV; the whole point of the writing surface is detail that only he has.

- [ ] **Step 5: Add the Open Graph image**

`src/assets/og-default.png`, 1200 by 630. Every `og:image` reference points at it, and `verify-build.mjs` asserts the tag exists but cannot assert the file does, so check:

```bash
ls -la src/assets/og-default.png
```

- [ ] **Step 6: Build and verify the whole site**

```bash
rm -f content/writing/.gitkeep content/projects/.gitkeep
npx ng test --no-watch
npm run build
```

Expected: tests pass, and `verify-build` reports 2 posts and 3 projects with all metadata present.

- [ ] **Step 7: Review the rendered site in a browser before committing**

Start the dev server and check the homepage, one post, one case study, `/ai` and `/about` in both light and dark, at desktop and mobile widths. Specifically confirm: no horizontal scroll on the body, code blocks scroll inside their own container, the availability line reads as a statement rather than a plea, and no em-dashes made it into the copy:

```bash
grep -rn '—' content/ src/app/pages/ && echo "EM-DASHES FOUND, fix them" || echo "no em-dashes"
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Write the launch content

Three case studies and two posts. The ERP case study leads on the two
decisions worth reading about: why the PostgreSQL cutover was sequenced
last, and why staying in C# removed the biggest correctness risk.

Every claim here is either already published on the old site or recorded in
the design spec's verified-facts section."
```

---

## Self-Review

**Spec coverage.** Walked each spec section against the tasks:

| Spec section | Task |
| --- | --- |
| Positioning and through-line | 9 (homepage h1, pinned by test) |
| IA: routes table | 1, 7, 8, 9, 10 |
| IA: nav of four outputs | 6 (pinned by test) |
| IA: `/ai` as toolkit page | 10 |
| IA: contact folds into About plus footer | 6, 10 |
| IA: availability as a sentence, visa detail moved | 9 (pinned by test), 10 |
| Homepage composition, six blocks in order | 9 |
| Deletions: Skills section, 13 bullets, grey bands, anchors, 8 components | 1, 2, 6, 10 |
| Pillars as one taxonomy | 3 (`PILLARS`, validated), 7 (filter) |
| Design direction: typefaces, palette, layout, motion | 2 |
| Content pipeline and frontmatter contract | 3, 4 |
| Sanitization decision | 7, 8 (resolved: bypass, with rationale in code) |
| Repo structure | 1, 2, 4, 5, 6, 7, 8, 9, 10 |
| Build and deploy, incl. 404 from `index.csr.html` | 1, 11 |
| Testing, incl. the post-build title assertion | 3, 11 |
| Verified ERP facts and case study outline | 12 |
| Phase 2 and 3 items | Deliberately out of scope |

No gaps found. Two spec items are deliberately deferred and called out in the tasks that touch them: the Gerber live demo (Phase 2, flagged in Task 12 Step 3) and the clean-room plugin repo (Phase 3, flagged in the `/ai` copy in Task 10).

**Placeholder scan.** No "TBD", no "add error handling", no "similar to Task N". Two places intentionally stop and ask rather than inventing: Task 10 Step 7 (the CV PDF) and Task 12 Step 1 (the three unconfirmed claims). Both are content-accuracy gates required by the spec, not unfinished plan steps.

**Type consistency.** Checked across tasks:

- `GeneratedEntry` fields (`slug`, `title`, `description`, `date`, `pillar`, `html`) are emitted in Task 4 and consumed identically in Tasks 5, 7, 8 and 9.
- `ContentService` method names used in Tasks 7, 8 and 9 all exist in the Task 5 definition: `allPosts`, `recentPosts`, `postBySlug`, `postsByPillar`, `allProjects`, `projectBySlug`.
- `Seo.set` is called with exactly `{ title, description, path }` in Tasks 7, 8, 9 and 10, matching the `PageMeta` interface in Task 5.
- `writingSlugs` and `projectSlugs` are emitted in Task 4 and consumed in Tasks 7, 8 and 11.
- One inconsistency found and fixed inline: Task 11 originally imported the slug list from `slugs.ts`, which Node 20 cannot load. Step 3 of that task now emits and reads a `slugs.json` sidecar instead.

**One risk worth naming.** Task 2 Step 1 depends on Google's CSS API to obtain the woff2 files. If that fetch fails the task instructs a stop rather than a CDN fallback, because the no-third-party-font constraint is not negotiable. The alternative, if it comes to it, is downloading the families manually from their upstream repositories, all three being open-licensed.
