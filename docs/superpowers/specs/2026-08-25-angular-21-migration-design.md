# Angular 17 → 21 Migration Design

**Date:** 2026-08-25
**Repo:** ravianand1988.github.io (personal portfolio, GitHub Pages user site)
**Branch:** `chore/migrate_to_angular_second_latest-rk`

## Goal

Move the site from Angular 17.3 to Angular 21.2 — the second-latest major, since npm
`latest` is 22.1.3. Along the way, adopt the idioms a v21 project ships with by default:
built-in control flow, zoneless change detection, and the Vitest-based unit-test builder.

## Target versions

Verified against the npm registry on 2026-08-25:

| Package | Now | Target |
|---|---|---|
| `@angular/*` | 17.3 | `^21.2.0` (21.2.21 latest) |
| `@angular/cli`, `@angular/build` | 17.3.17 (`@angular-devkit/build-angular`) | `^21.2.18` |
| `typescript` | ~5.4.2 | `~5.9.2` (v21 peer range `>=5.9 <6.1`) |
| test runner | karma 6.4 + jasmine 5.1 | `vitest ^4.0.8` + `jsdom ^28.0.0` |
| `zone.js` | ~0.14.3 | removed |
| CI Node | 20 | 22 |

Local Node is v20.20.2, which satisfies Angular 21's `^20.19.0 || ^22.12.0 || >=24.0.0`,
so no local runtime change is required to do the work.

## Approach: direct rewrite against a v21 reference

Rather than four sequential `ng update` hops (17→18→19→20→21), rewrite the build
configuration in one pass to match a freshly scaffolded Angular 21 project.

A reference project was generated with `npx @angular/cli@21 new --style=scss --ssr=false`
and inspected; every config decision below is copied from that scaffold rather than
inferred.

**Why this is viable here.** The app has no dependency injection (zero constructors in
`src/`), no router, no services, no guards, no interceptors, no forms, and no NgModules.
The entire source is nine standalone components of static markup plus three typed data
arrays. There is almost nothing for Angular's migration schematics to act on beyond the
control-flow rewrite, which is three templates.

**What this trades away.** Angular's own migration code is not run, so config correctness
rests on matching the reference scaffold. There is no intermediate per-major state to
bisect — though the chosen squashed-commit strategy already forfeits that.

**Mitigation.** The work stays on a branch and is verified against a production build, the
test suite, and a manual render of the running site before `master` is touched. `master`
auto-deploys the public site on push, so the branch is the safety boundary.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Target major | 21 | Second-latest; 22 is `latest` |
| Migration method | Direct config rewrite (Approach B) | Tiny app, no DI/router/services |
| Control flow | Migrate to `@if`/`@for` | User-requested modernization |
| `inject()` migration | No-op | Zero constructors exist |
| Change detection | Zoneless | User-requested; static site with no async work |
| Test runner | Vitest via `@angular/build:unit-test` | User-requested |
| Commit granularity | One squashed commit | User choice |
| CI Node | Bump to 22 | Node 20 past maintenance; still inside v21's range |
| Asset location | Keep `src/assets/` | Moving to `public/` changes the served URL of `photo.jpg` |
| Component filenames | Keep `*.component.ts` | v20 renamed the scaffold convention; renaming 27 files is churn |
| `anyComponentStyle` budget | Keep 2kB/4kB | v21 default relaxes to 4kB/8kB; CLAUDE.md records ours as deliberate |
| Unused deps | Drop | `animations`, `platform-browser-dynamic`, `router`, `forms` are imported nowhere |

## Target configuration

### package.json

Dependencies reduce to what the app actually imports:

```json
"dependencies": {
  "@angular/common": "^21.2.0",
  "@angular/compiler": "^21.2.0",
  "@angular/core": "^21.2.0",
  "@angular/platform-browser": "^21.2.0",
  "rxjs": "~7.8.0",
  "tslib": "^2.3.0"
},
"devDependencies": {
  "@angular/build": "^21.2.18",
  "@angular/cli": "^21.2.18",
  "@angular/compiler-cli": "^21.2.0",
  "jsdom": "^28.0.0",
  "typescript": "~5.9.2",
  "vitest": "^4.0.8"
}
```

Removed: `@angular/animations`, `@angular/platform-browser-dynamic`, `@angular/forms`,
`@angular/router`, `@angular-devkit/build-angular`, `zone.js`, and all six karma/jasmine
packages. `rxjs` stays because `@angular/core` and `@angular/common` both declare it as a
required peer.

### angular.json

- `build` builder: `@angular-devkit/build-angular:application` → `@angular/build:application`
- `serve` builder: `@angular-devkit/build-angular:dev-server` → `@angular/build:dev-server`
- `test` target: replaced wholesale with `{ "builder": "@angular/build:unit-test" }` — no
  options. The builder defaults `tsConfig` to `tsconfig.spec.json`, defaults `buildTarget`
  to `build:development`, and runs in jsdom under Node when `browsers` is unset.
- Delete `"polyfills": ["zone.js"]` from `build`, and the whole `polyfills` array from the
  old test target. Zoneless in v21 is the *absence* of zone.js, not a provider — the
  reference scaffold has no polyfills entry and no `provideZonelessChangeDetection()` call.
- Delete the `extract-i18n` target; the v21 scaffold does not include one and the site has
  no i18n.
- Preserve unchanged: `outputPath: dist/ravianand1988.github.io` (coupled to the deploy
  workflow's artifact path), `index`, `browser`, `assets`, `styles`, `inlineStyleLanguage`,
  `scripts`, both budget entries, and both configurations.

### tsconfig.json

Adopt the v21 shape: add `isolatedModules: true`, replace `module: "ES2022"` +
`moduleResolution: "node"` with `module: "preserve"`, drop `outDir`, `sourceMap`,
`declaration`, `esModuleInterop`, `useDefineForClassFields`, and `lib`, and add project
references to the two child configs with `"files": []`.

`angularCompilerOptions` is unchanged — the v21 scaffold's block is byte-identical to the
current one, including `strictTemplates`.

### tsconfig.app.json / tsconfig.spec.json

- app: `include: ["src/**/*.ts"]` + `exclude: ["src/**/*.spec.ts"]`, replacing the
  `files: ["src/main.ts"]` form.
- spec: `types: ["jasmine"]` → `["vitest/globals"]`.

## Source changes

1. **`app.config.ts`** — add `provideBrowserGlobalErrorListeners()`, which the v21 scaffold
   includes by default. This ends the deliberately-empty `providers` array that CLAUDE.md
   documents, so CLAUDE.md is updated to match.
2. **All nine components** — remove `standalone: true`; standalone has been the default
   since v19 and the property is now redundant.
3. **`experience`, `projects`, `skills`** — rewrite `*ngFor` → `@for`, `*ngIf` → `@if`, and
   drop the now-unused `CommonModule` import from each component's `imports` array. These
   are the only three components using structural directives.
   - `@for` requires a `track` expression. All six loops use `track $index`: the lists are
     static class fields that never reorder, and three of them iterate plain strings where
     tracking by identity would throw on duplicate values.
4. **`app.component.spec.ts`** — `fixture.detectChanges()` → `await fixture.whenStable()`
   and make the test callback `async`, matching the v21 scaffold's spec. Under zoneless,
   `whenStable()` is what flushes the initial render. `describe`/`it`/`expect`/
   `toBeTruthy`/`toContain` all exist as Vitest globals, so no other rewriting is needed.

`main.ts`, `index.html`, `styles.scss`, and all component SCSS are unchanged.

## Deployment

`.github/workflows/deploy.yml`: `node-version: 20` → `22`. The artifact path
`dist/ravianand1988.github.io/browser` is unchanged, because `outputPath` is preserved and
`@angular/build:application` writes to the same `browser/` subdirectory as its predecessor.

## Documentation

CLAUDE.md needs four edits: the Angular version in the opening description; the test
commands (karma/Chrome flags → `ng test --no-watch`); the "empty `providers` array on
purpose" claim; and the note that content sections render with `*ngFor` (now `@for`).

## Risks

| Risk | Assessment |
|---|---|
| `useDefineForClassFields` becomes `true` | The one change that alters *runtime* semantics rather than build config. All class fields in `src/` are plain array/string initializers with no inheritance or decorator interaction, so no impact is expected. Caught by the render check if wrong. |
| Zoneless without an explicit provider | The reference scaffold relies on the framework default with no provider call. If change detection fails to run after removing zone.js, the fallback is an explicit `provideZonelessChangeDetection()` in `app.config.ts`. Verified by the render check. |
| Vitest + jsdom behaves differently from Karma + Chrome | Only one spec exists and it asserts on `h1` text content, which jsdom handles. Low exposure — but also a thin net generally. |
| Config drift from not running `ng update` | Every value is copied from a real v21 scaffold rather than inferred, and the production build is the acceptance gate. |
| Regression reaches the public site | Work stays on the branch; `master` is only updated after the full verification pass. |

## Verification

All must pass before the branch merges:

1. `rm -rf node_modules package-lock.json && npm install` — clean resolve, no peer
   warnings. The regenerated `package-lock.json` is committed; CI runs `npm ci`, which
   requires a lockfile consistent with the new `package.json`.
2. `npm run build` — production build succeeds, budgets not exceeded.
3. `ls dist/ravianand1988.github.io/browser/index.html` — confirms the deploy workflow's
   artifact path still resolves.
4. `npx ng test --no-watch` — both tests in `app.component.spec.ts` pass under Vitest.
5. `npm start`, then load `http://localhost:4200` and confirm: every section component
   renders (nav, hero, about, experience, projects, skills, contact, footer), the hero
   photo loads from `assets/photo.jpg`, the three data-driven sections (experience,
   projects, skills) show their full lists, and every nav anchor scrolls to its section.

Step 5 is the real acceptance test. The suite asserts one `<h1>`; the control-flow and
zoneless changes are only meaningfully verified by looking at the rendered page.

## Out of scope

Moving assets to `public/`, renaming components to the v20 `app.ts` convention, adding
Prettier (the v21 scaffold now includes it; CLAUDE.md records that this repo has no
formatter by choice), relaxing the component style budget, and writing the additional
specs that would give this migration a real regression net.
