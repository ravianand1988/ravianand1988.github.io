# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ravi Anand Kumar's personal portfolio site — an Angular 17 single-page app deployed as a GitHub Pages **user site**
(https://ravianand1988.github.io/). It is a content site, not a product: most changes are copy edits to the data
arrays and static markup in the section components, not new abstractions.

## Commands

```bash
npm start                                   # dev server on http://localhost:4200
npm run build                               # production build → dist/ravianand1988.github.io/browser
npm test                                    # Karma + Jasmine, opens Chrome, watch mode
ng test --watch=false --browsers=ChromeHeadless           # single CI-style run
ng test --watch=false --include='**/app.component.spec.ts' # single spec file
```

There is no linter or formatter configured. Formatting comes from [.editorconfig](.editorconfig): 2-space indent,
single quotes in TS, final newline, no trailing whitespace.

## Architecture

Standalone components only — no NgModules, no router, no state library. [app.config.ts](src/app/app.config.ts) has an
empty `providers` array on purpose.

- [main.ts](src/main.ts) bootstraps `AppComponent` via `bootstrapApplication`.
- [app.component.html](src/app/app.component.html) is the whole page: it stacks `<app-nav>` plus one component per
  section in render order. Adding a section means creating the component, importing it into `AppComponent.imports`,
  and placing its tag here.
- Each section lives in [src/app/sections/](src/app/sections/) as a standalone component whose template opens with
  `<section id="..." class="section">`. Navigation is **anchor-based**: [nav.component.html](src/app/sections/nav/nav.component.html)
  links to those `id`s. A new section is only reachable if its `id` matches a nav `href`. Routerless anchor navigation
  is deliberate — it keeps the site working on GitHub Pages with no server-side rewrite rules.
- Content-heavy sections (experience, projects, skills) hold their data as typed arrays on the component class with a
  small local `interface` (`ExperienceEntry`, `ProjectEntry`, `SkillGroup`) and render them with `*ngFor`. Edit the
  array, not the template, to change content. Hero/about/contact/footer are static markup.

## Styling

[src/styles.scss](src/styles.scss) is the design system: CSS custom properties on `:root` with a
`@media (prefers-color-scheme: dark)` override block, plus shared utility classes — `.section`, `.section-alt`
(alternating background), `.eyebrow`, `.card`, `.tag`, `.btn` / `.btn-primary`. Component SCSS handles only
component-specific layout and should consume the `var(--…)` tokens rather than hard-coded colors, so both themes stay
correct. Sections alternate `.section` / `.section-alt` down the page — keep that rhythm when inserting one.

Component styles are budgeted at 2 kB (warning) / 4 kB (error) in [angular.json](angular.json); a bloated
`*.component.scss` fails the production build.

## Deployment

Push to `master` → [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs `npm ci && npm run build` and
publishes `dist/ravianand1988.github.io/browser` through GitHub Pages' native Actions deployment. The workflow's
artifact path is tied to the `outputPath` in [angular.json](angular.json) — changing one requires changing the other.
Repo **Settings → Pages** source must stay on **GitHub Actions**.

## Content accuracy

The site states this person's real employment history, dates, and claims that recruiters read. Several commits in the
history exist purely to walk back unverified metrics and overstated scope. Do not invent, round up, or embellish
achievements, numbers, dates, or job titles — write only what the user has confirmed, and ask when a claim is not
already in the file.
