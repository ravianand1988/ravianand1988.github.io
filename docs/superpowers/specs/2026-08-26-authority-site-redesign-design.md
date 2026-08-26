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
   *evidence*. **Phase 1 leads with the distribution ERP**, now that it is a
   completed solo migration with a retired predecessor: it is the strongest
   story and the one that most directly evidences the through-line. Gerber may
   be promoted to first position in Phase 2, once its embedded demo exists and
   the "visual and memorable" argument actually applies; in Phase 1 its
   evidence line points at a case study, with no "live demo" label.
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

## Verified project facts: the distribution ERP

Read directly from `/home/ravi-kumar/ravi/AyurvedicAushdhalaya` on 2026-08-26.
This is the strongest evidence on the site for the through-line, and the
current site compresses it into one sentence ending "Repository private for
now". It gets a full case study at `/projects/distribution-erp`.

**Business framing:** FMCG wholesale and distribution (Ravi's preference,
2026-08-26). The `~90 consumer brands` figure is confirmed correct by Ravi
(2026-08-26) and may be published; it is not derivable from the repo, so treat
his confirmation as the source.

**Timeline, corroborated by the repo:** dated schema snapshots in
`Common Resources/` run from `AADB_whole_2017_07_26.sql` to
`AADB_gst queries_2017_10_30.sql`, and assembly copyright headers read
2015/2016. The desktop app was therefore already being schema-evolved in 2017,
with GST support added that October, matching India's July 2017 GST rollout.
Git history starts 2026-01-08 ("Add project files") and is an import, so it
does not evidence the original build date. The site's "since 2018" is
conservative; "in production since 2019" still needs Ravi's confirmation.

**The legacy app.** .NET Framework 4.5.2 WinForms, DevExpress 18.2, EF6
database-first, Unity IoC, SQL Server. No authentication, no tests, no
migrations. Business rules fused into form code-behind: GST calculation,
invoice totalling and stock movement live inside `SalesInvoice.cs` (~1,500
LOC), `NewPurchase.cs` (~1,700 LOC) and `SalesReturnFormNew.cs` (~1,200 LOC).
Repositories each open their own `AADbContext` with no shared unit of work, so
multi-entity operations are not transactional.

**The web tier.** Angular 21 SPA (`aa-web`), 201 files and roughly 32,300 lines
of TS/HTML/SCSS, Angular Material and CDK, AG Grid 36, ESLint, Prettier,
Vitest. ASP.NET Core on .NET 10 with EF Core migrations and a versioned schema
baseline, ASP.NET Core Identity plus RBAC with public registration
deliberately disabled (invite-only), QuestPDF and ClosedXML replacing
XtraReport, iTextSharp and Office Interop, OpenAPI and health checks.
Integration tests run against real SQL Server via Testcontainers plus
`WebApplicationFactory`. Docker and compose, nginx-served SPA, IIS with URL
Rewrite and ARR as reverse proxy, services under NSSM. 103 PRs and 15
versioned releases through 1.15.0. SPA feature modules: login, dashboard,
customers, suppliers, businesses, sales, purchases, purchase-returns,
inventory, ledger, expenses, reports, admin, account.

**The migration is complete, not in progress.** Confirmed by Ravi 2026-08-26:
the WinForms app is out of use. Verified against the 11 migration units in
`docs/web-migration-plan.md` §4 — every one has shipped routes in the SPA
(`login`, `change-password`, `admin/users`, `dashboard`, `customers` +
`:id/account`, `products` + `:id/stock`, `measurement-units`, `suppliers` +
`:id/account`, `purchases`, `purchase-returns`, `sales`, `admin/businesses`),
plus `expenses` and `ledger`, which the desktop app never had. Together with
RBAC and a real test suite, the web app exceeds the desktop app's scope rather
than merely matching it.

The site's current claim, "now leading a zero-downtime strangler-pattern
migration ... with a planned SQL Server to PostgreSQL cutover", therefore
undersells the work in two ways: the strangler migration is finished, and the
Angular stack is not "in progress" but the system of record.

Accurate framing: a WinForms desktop app that ran the business from 2017 was
replaced, module by module, by an Angular 21 and ASP.NET Core web app now in
daily use, delivered solo across 15 releases. The business never stopped
trading, because both applications ran against the same SQL Server database
throughout and the desktop app was only retired once the web app covered its
work.

**Consequence worth noting, and currently live.** Phase 9 (the PostgreSQL
cutover) was deliberately sequenced last for one reason: the WinForms/EF6 app
speaks only SQL Server and had to keep writing to the shared `AADB`. With the
desktop app out of use that constraint is released, so the remaining work is a
provider swap to Npgsql plus a data port and targeted type fix-ups. Nothing
blocks it any more.

**Deployment reality.** In daily use, deployed on a single Windows 11 machine.
Self-hosting on one box is a deliberate cost decision for a family business,
not a limitation to hide. Databases are backed up nightly by
`web/backup-aadb.ps1` and copied to OneDrive automatically; that script
verifies each backup with `RESTORE VERIFYONLY` before copying it out of the
container, and prunes past a retention window.

**The architectural decision worth leading with.** PostgreSQL is the end state,
but the engine switch is deliberately sequenced last, because the WinForms app
speaks only SQL Server and must keep writing to the shared `AADB` throughout
the transition. `docs/web-migration-plan.md` documents the alternative,
running both engines with change-data-capture during the overlap, and rejects
it explicitly as too risky for financial data. Staying in C# was also a
de-risking choice: `decimal` money math is preserved exactly and the GST rules
port near line-for-line instead of being re-derived.

### Case study outline

1. What it runs: GST invoicing, stock, sales and purchase orders, returns,
   ledger, expenses, multi-business.
2. The starting position, stated honestly, including the three large
   code-behind files where the business rules actually live.
3. Why the hard part is not CRUD but recovering rules from UI event handlers.
4. The database sequencing constraint and the rejected CDC alternative.
5. Why staying in C# removed the biggest correctness risk.
6. What has shipped, module by module.
7. How it is tested, deployed and backed up on one machine, on purpose.

### Repo visibility

Ravi intends to make the repo public later, after a security cleanup
(2026-08-26). The case study is therefore written with no code links, and
structured so a repository link can be added later without rewriting it.

**Cleanup blocker found 2026-08-26.** Five tracked files in `Common Resources/`
contain real business rows, not just schema: `AADB_whole_2017_09_12.sql` (173
INSERTs), `AADB_whole_DataOnly_2017_09_12.sql` (168),
`AADB_whole_2017_09_15.sql` (125), `AADB_whole_2017_08_03.sql` (18) and
`AADB_whole_2017_07_26.sql` (13), inserting into `Customers`, `Suppliers`,
`Employees`, `Orders`, `OrderDetails`, `GSTDetails`, `Products`, `Businesses`
and `Companies`. They are present from the first commit, so deleting them in a
new commit does not remove them from history. Publishing requires either a
history rewrite with `git filter-repo` or a fresh repo with no history. There
is no current exposure while the repo stays private. `web/backup-aadb.ps1` and
the committed `appsettings*.json` were checked and are clean.

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

1. ~~The ERP's Windows Forms to web story.~~ **Fully resolved 2026-08-26** —
   see "Verified project facts" above. The WinForms app is retired, module
   parity is verified, and the `~90 consumer brands` figure is confirmed.
2. Two launch posts. Cannot be written from a bullet list without inventing
   detail; needs one working session per post.
3. An evidence line for each selected-work item. "Repository private" is not
   evidence. What can a stranger actually verify? Partly resolved for the ERP:
   release count, module list and test/deploy setup are all verifiable claims
   even while the repo is private.
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
