# Portfolio redesign: from CV-in-HTML to authority site

Date: 2026-08-26
Status: design approved in conversation, pending written review

## Why

The current site is a resume rendered as a single anchor-scrolled page. Its
nav (About / Experience / Projects / Skills / Contact) is the default shape of
every portfolio template, its hero opens with two competing year-counts, three
of four projects say "Repository private for now", and its CSS makes no visible
typographic or interaction decisions. For someone claiming frontend
architecture depth, that last point argues against the claim.

Reference set studied: stevekinney.com, leerob.com and joshwcomeau.com
(authority sites, nav lists outputs not resume headings), brittanychiang.com
(the hire-me archetype done well), emilkowal.ski and cassie.codes (the site as
craft evidence).

## Positioning

Through-line, stated on the page and used to justify why four writing topics
belong together:

> I take frontends that have outgrown their structure and make them workable
> again.

Support copy:

> Shared design systems instead of copy-paste. Migrations that ship while the
> business keeps running. AI tooling a team actually uses every day.

Availability is one plain sentence, not a pill: "Looking for my next frontend
lead role in Berlin, or remote within the DACH region." Residency and work
authorization move to `/about` and the CV, where they answer a question rather
than lead.

Four content pillars, one taxonomy field, used by both writing and projects:
`ai-engineering`, `frontend-architecture`, `migrations`, `leading-teams`.

## Information architecture

| Route | Purpose |
| --- | --- |
| `/` | Composed argument, not a section stack |
| `/writing` | All posts, client-side filter by pillar (no per-pillar routes in Phase 1) |
| `/writing/:slug` | Post |
| `/projects` | Selected work, 4-6 entries |
| `/projects/:slug` | Case study; Gerber's carries the live demo |
| `/ai` | "Building with AI": the toolkit itself, not an essay category |
| `/about` | Career narrative, CV download, contact |
| `/rss.xml`, `/sitemap.xml`, `/404.html` | Generated at build |

Nav: **Writing / Projects / Building with AI / About**. Four items, all outputs.

`/ai` is deliberately a product page rather than a blog tag: it documents the
Claude Code skills suite, what each skill does, how a team adopts it, and how
to install it. This is the sharpest differentiator and currently sits buried in
paragraph two of About.

Contact folds into `/about` plus a footer present on every page. A standalone
contact page on a personal site is filler.

### Homepage composition, in order

1. Thesis. Hero sentence set large, two lines of support, one availability
   line. No centered avatar column.
2. Selected work. Three items, hard cap. One line of *what*, one line of
   *evidence*. Gerber leads because it is the only visual one. In Phase 1 its
   evidence line points at a case study; the "live demo" label appears only
   once the embedded demo ships in Phase 2.
3. Recent writing. Latest three with date and pillar.
4. Building with AI. Short block leading with the concrete claim, linking `/ai`.
5. Career as one paragraph. AppFlow to Assistr to byrd as narrative with the
   through-line stated. Not a timeline widget.
6. Footer. Contact, socials, RSS.

### Deletions

- The Skills section, entirely. Skills become tags on the roles and projects
  that prove them. "Git" and "Jira" do not return.
- The 13-bullet byrd dump. Four bullets on `/about`, each linking to the case
  study carrying the detail.
- The alternating `.section` / `.section-alt` grey band rhythm.
- Anchor navigation. `app.component.html` becomes a shell: header,
  `router-outlet`, footer.
- All eight existing section components. `styles.scss` rewritten from scratch.

## Design direction: Editorial Ink

Chosen from three rendered options. Argues "I write, and I have taste": a
high-contrast display serif reads as considered rather than templated, while
monospace carrying every piece of metadata keeps it feeling engineered. It is
also the only one of the three actually built for reading, which the archetype
requires.

Rejected: an all-Geist "engineering grid" direction (correct thesis, but it is
the current house style of half of developer tooling) and a Space Grotesk
"swiss grotesque" direction (most confident, but reads as a designer's
portfolio and is punishing across a long post).

### Typefaces

Self-hosted `woff2`, latin subset, in `src/fonts/`. No Google CDN request: it
removes a third-party dependency, avoids layout shift, and for this site the
performance claim should be demonstrated rather than asserted.

- Display: Instrument Serif (regular + italic)
- Body and UI: Geist
- Metadata, eyebrows, dates, code: Geist Mono

### Palette

Light (primary):

| Token | Value |
| --- | --- |
| `--paper` | `#FAF7F2` |
| `--ink` | `#17130E` |
| `--ink-muted` | `#4A4238` |
| `--ink-subtle` | `#6B6252` |
| `--meta` | `#8A7B65` |
| `--rule` | `#DCD5C9` |
| `--rule-soft` | `#EAE4D9` |
| `--accent` (oxblood) | `#7C2A20` |
| `--brass` | `#C9A15B` |

Dark counterpart, to be built alongside rather than after. The existing dark
palette is cold navy and cannot sit next to warm paper. Starting values, to be
tuned against real text:

| Token | Value |
| --- | --- |
| `--paper` | `#14110D` |
| `--paper-raised` | `#1C1813` |
| `--ink` | `#F0EAE0` |
| `--ink-muted` | `#A79B8A` |
| `--rule` | `#2E2820` |
| `--accent` | `#D9705E` (oxblood lifted for contrast on dark) |
| `--brass` | `#C9A15B` |

Accent usage is sparing: italic emphasis in the thesis, the availability rule,
link underlines. Brass is a hairline accent only.

### Layout rules

- Left-aligned, generous measure. Prose capped near 68ch, headings near 24ch.
- Hairline rules instead of cards and shadows.
- Monospace uppercase micro-labels for section headers and all metadata.
- Row-based lists for work and writing, not a card grid.

Motion is restrained and limited to what serves reading: link underline
transitions, and reduced-motion respected throughout.

## Content pipeline

`@angular/build:application` is esbuild-based with no supported hook for
importing markdown. So a prebuild script, wired as the npm `prebuild` hook,
which means `npm run build` triggers it automatically and **the existing deploy
workflow needs no change**.

```
content/writing/*.md    ->  tools/build-content.mjs  ->  src/generated/*.ts
content/projects/*.md                                    prerender-routes.txt
                                                         rss.xml, sitemap.xml
```

Dev dependencies only, nothing ships to the browser:

- `gray-matter` for frontmatter
- `marked` for markdown
- `shiki` for build-time syntax highlighting, so code blocks cost no client JS

Frontmatter contract, deliberately small:

```yaml
title: What a team actually does with AI tooling
description: feeds meta description and og:description
date: 2026-08-26
pillar: ai-engineering
draft: false
```

`src/generated/` is gitignored. Markdown in `content/` is the source of truth,
so a post can be written in any editor without touching a component.

### Sanitization decision

Rendered post HTML is bound with `bypassSecurityTrustHtml`, because Angular's
sanitizer strips the inline styles Shiki emits. This is safe here specifically
because the content is first-party markdown compiled at build time with no
user-input path; the justification goes in a code comment at the call site. If
Shiki's class-based output survives sanitization cleanly, prefer that instead
and drop the bypass. Implementation must check which is true rather than assume.

## Repo structure

```
content/{writing,projects}/*.md
tools/build-content.mjs
src/
  fonts/                      self-hosted woff2, latin subset
  styles/
    _tokens.scss              colour, type scale, spacing (light + dark)
    _typography.scss
    _prose.scss               markdown output styling
    index.scss
  app/
    app.component.ts/.html    shell: header, router-outlet, footer
    app.routes.ts             (existing file names kept, contents replaced)
    core/{seo.ts, content.ts}
    layout/{site-header,site-footer}/
    pages/{home,writing-index,writing-post,projects-index,
           project-detail,ai,about,not-found}/
    features/gerber-demo/     Phase 2, lazy-loaded
```

The 2 kB per-component style budget in `angular.json` stays as-is. Prose and
token styles live in global `styles/`, so no component needs to exceed it.

## Build and deploy

Target configuration:

- `ng add @angular/ssr`
- `outputMode: "static"`
- `prerender: { discoverRoutes: true, routesFile: "prerender-routes.txt" }`
- `404.html` copy of the index as a fallback for any route that escapes
  prerendering

Both builder options were verified present in the installed
`@angular/build@21.2.18` schema. **Not yet verified:** the exact entry-point
wiring Angular 21 requires for static output, and whether prerendered HTML
lands in `dist/ravianand1988.github.io/browser` where `.github/workflows/deploy.yml`
already points its artifact path.

Therefore implementation step one is a spike: get a single route prerendering
and inspect the output tree before any design work. If the output path differs,
the workflow's artifact path changes with it.

Per-route `<title>`, meta description and `og:image` are set through Angular's
`Title` and `Meta` services and baked into each static file at build time. This
is the whole reason for choosing SSG: a writing-forward site whose posts all
share the homepage's link preview is broken at its core purpose.

## Testing

Proportionate to a content site. The only real logic is the content script, so
that is where tests go:

- frontmatter parsing, slug generation, date ordering, draft exclusion, RSS shape

Plus one post-build assertion in CI that proves the SSG claim rather than
assuming it: `dist/ravianand1988.github.io/browser/writing/<slug>/index.html`
exists and contains that post's own title in its `<title>` tag.

No broad component tests. On static pages they would be busywork.

## Phasing

**Phase 1 (this spec).** Design system, router plus SSG, new IA, rewritten hero
and About on the through-line, byrd cut to four bullets, Skills section
deleted, `og:image` and RSS. Ships with two posts. Two posts on a page that
does not advertise an archive is fine.

**Phase 2.** Gerber viewer as an embedded live demo. The ERP case study
including the Windows Forms to web migration. Both are distinctive and need
nobody's permission.

**Phase 3.** Clean-room AI plugin repo published under his own name, remaining
case studies, further small open-source Angular libraries. Ongoing, no deadline.

Only Phase 1 needs a spec. Phases 2 and 3 are content and separate repos.

## Prerequisites and open questions

**Blocking on merge order.** The Angular 21 migration is unmerged: `master` is
still on Angular 17. This redesign hard-depends on Angular 21 for router and
SSG. `chore/migrate_to_angular_second_latest-rk` must land on `master` before
this work does. This spec's branch is based on that branch.

**Blocking on facts from Ravi.** None of these may be invented, per the content
accuracy rule:

1. The ERP's Windows Forms to web story: what the original was, when the web
   migration started, what is live now versus still on desktop, and whether
   "zero downtime" is literal or approximate.
2. Two launch posts. Cannot be written from a bullet list without inventing
   detail; needs one working session per post.
3. An evidence line for each selected-work item. "Repository private" is not
   evidence. What can a stranger actually verify?
4. Confirmation that `Ravi_Anand_Kumar_CV_updated.docx` is still the master CV
   to link from `/about`.
5. A better photograph, and a source for the `og:image`.

**Accuracy items to settle while rewriting the byrd bullets.** These claims are
currently published and move to more prominent positions under the new IA, so
they should be confirmed or reworded now: the Selenium end-to-end coverage
claim, "500+ customers", and "100,000+ orders/month".

**Optional, not in Phase 1.** A custom domain. `ravianand1988.github.io` in an
application reads as a side project; an owned domain reads as a professional
presence. Needs a purchase, a DNS record and a `CNAME` file.

## Non-goals

- No CMS, no admin UI, no comments. Markdown in git is the authoring surface.
- No analytics in Phase 1.
- No newsletter in Phase 1.
- No automated connector or scraper for any third-party site.
- No rebuild on a non-Angular stack. Keeping it Angular is part of the argument.
