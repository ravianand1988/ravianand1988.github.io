# Core & Consumers: design direction

Status: implemented, phases 01 to 07 landed on 2026-08-27
Date: 2026-08-27
Branch: `feat/design-system-refresh-rk`
Review artifact: https://claude.ai/code/artifact/5de8c25a-f60a-4e24-af84-02f0d59200cb

Supersedes the visual layer of `2026-08-26-authority-site-redesign-design.md`. That
redesign's information architecture, content pipeline and prerendering all stand. Only the
visual system changes.

## Why

The site today is cream `#faf7f2`, Instrument Serif, terracotta `#7c2a20`, hairline rules
and a single 74ch column. That combination is the most common output of current generative
design tools, and it is the one part of the site that does not look like a decision.

It also conflicts with the brief in two measurable ways:

- The brief asks for a modern sans-serif display face. The site uses an editorial serif.
- The brief asks for an exceptional desktop experience. The site is a 74-character column
  with two thirds of a laptop viewport left empty.

## The organising idea

All three case studies express one idea, and `gerber-viewer.md` names it outright: find the
part that does not care about its consumer, and keep it that way.

- federkleid: one design system, three dashboards, versioned so each upgrades on its own
  schedule.
- Gerber viewer: one parsing core, three front ends.
- Distribution ERP: one set of business rules kept portable so they survived a rewrite.

So the visual language derives from versioned dependency graphs and release order, not from
generic nodes-and-networks imagery.

## Signature element

A `SystemGraph` component: a core node, N consumer nodes, orthogonally routed traces with
eased corners and junction pads, and the version each consumer sits on. One consumer
deliberately lags, because independent upgrade schedules are the actual argument.

Used three times: the homepage hero, `/projects/byrd-design-system` (federkleid and the three
dashboards), and `/projects/gerber-viewer` (parser core, .NET library, WPF shell, canvas
renderer). Same component, different data.

The trace routing is borrowed from the PCB geometry in the Gerber work. It is the one place
the design takes a real risk, and the risk is anchored in the subject rather than in
decoration.

## Tokens

Cool blue-biased neutrals so the ground reads as chosen rather than inherited. One warm
chroma, carried over from the existing `--brass`, which keeps continuity with the current
identity and stops the palette going cold. Semantic colours exist for state only and never
act as the accent.

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#eef2f6` | `#0d1319` |
| `--surface` | `#ffffff` | `#141d25` |
| `--panel` | `#e3e9ef` | `#1a242e` |
| `--ink` | `#0d141b` | `#e7edf3` |
| `--ink-muted` | `#45525f` | `#9aabb8` |
| `--ink-subtle` | `#5a6874` | `#7d8d9b` |
| `--border` | `#cfd9e2` | `#26313d` |
| `--brass` | `#855e1e` | `#d9a94f` |

The light values are set by measurement, not by eye. Every ink and the brass clear 4.5:1
against ground, panel and surface, because they are used on 11px mono labels. Measured in
the review artifact: light ink 16.48, muted 7.11, subtle 5.09, brass 5.16 against ground;
worst case across all three surfaces is 4.68. Dark worst case is 4.61. No AA failures in
either theme.

A first draft used `--ink-subtle: #6d7c89` and `--brass: #8a6220`, which measured 3.81 and
4.46 on panel. Both failed. They were corrected before this document was written.

## Type

| Role | Face | Notes |
| --- | --- | --- |
| Display | Archivo 600–700 | Tight technical grotesk. Replaces Instrument Serif. |
| Body | Geist 400 | Already self-hosted. |
| Data | Geist Mono 400–500 | Versions, counts, dates, labels. Never prose. |

Net font payload goes down: two Instrument Serif files out, one Archivo file in.

Mono is reserved for things that are literally data. This matters because the metadata rail
is entirely mono, and if mono also decorates prose the rail stops meaning anything.

## Layout

Two tracks. A narrow left rail in mono carries metadata that currently has nowhere to live
(pillar, date, stack, scale, on-this-page). A 66ch main track carries prose.

Below 1024px the rail does not stack underneath, which would bury it. It becomes a single row
of mono chips under the title, and the on-this-page list becomes a collapsed `<details>`.

## Components

`SystemGraph`, `PageRail`, `SiteHeader`, `SiteFooter`, `WorkRow`, `DecisionCard`,
`MetricList`, `StackGroup`, `Prose`, `Button`, `ThemeToggle`.

Each component SCSS stays inside the existing 2 kB warning / 4 kB error budget in
`angular.json`.

## Deliberate deviations from the brief

1. **Case studies get a six-part spine, not the eleven named sections requested.** The
   existing prose already delivers constraints, options, decision and trade-offs inside
   headings like "Two decisions that made it survivable". Eleven labelled sections would
   require padding, which the content rules forbid. `DecisionCard` surfaces the judgement
   without a form to fill in.
2. **One new interactive demo, not five.** The Gerber viewer already runs a real parser via
   the published `ngx-gerber` package. A token playground and a virtual-scrolling demo beside
   it would be filler competing with the genuine article. Keep Gerber, add `SystemGraph`, cut
   the rest.
3. **No state library.** This is a prerendered static content site; its state is the URL and a
   theme preference. Signals and the existing `ContentService` are the honest answer.
4. **Hybrid of the four differentiator options, not the full system map.** A portfolio that
   behaves entirely as an explorable graph fails the ten-second objective and fights keyboard
   navigation, prerendering and indexing. The system language belongs in the diagram, not the
   navigation.
5. **Experience stays on `/about`.** Six roles going back to 2011 as homepage cards would push
   the three case studies below the fold.

## Non-design findings

These are correctness problems found while reading the repo. They are separable from the
redesign and phase 01 should ship on its own.

1. **The homepage contradicts the agreed byrd end date.** `home.component.html:78` says "from
   2019 to 2026 at byrd". `about.component.html:15` says "Oct 2019 to Present". Project
   instructions require Present on every surface and explicitly forbid a 2026 end date.
2. **"13+ years of software engineering" does not survive the about page's own dates.**
   Engineering roles start Dec 2013 (INF India), which is 12 years 9 months to 2026-08-27.
   Counting from the NIIT training role in Mar 2011 gives 15 years, defensible only if framed
   as time in the industry rather than as engineering. Needs a decision before any surface
   states a number.
3. **`CLAUDE.md` documents the pre-redesign site.** It describes `src/app/sections/`,
   anchor-based navigation and a single `styles.scss`. Master has `pages/`, `layout/`, a
   router, a content pipeline and `src/styles/`. It will mislead every future session until
   corrected. Rewriting it is part of this branch.
4. **`ngx-gerber` was missing from `node_modules`** although present in `package.json`, so
   `npm start` failed to compile until `npm install` was run. Worth a note in the commands
   section of `CLAUDE.md`.
5. **The Selenium claim is still unresolved and still published.** Cheapest to settle while
   every surface is being rewritten anyway.

## Quality gates

| Area | Commitment | Verified by |
| --- | --- | --- |
| Contrast | AA for text in both themes | token contrast check in `tools/` |
| Keyboard | Skip link, visible brass focus ring, graph nodes are real links in DOM order | manual tab pass per page |
| Motion | Trace animation is the only motion; stops under reduced-motion | existing global media query |
| Semantics | One `h1` per page, no skipped levels, rail is an `aside` | extend `tools/verify-build.mjs` |
| Payload | Net font reduction; graph is inline SVG and CSS, no JS | Angular budgets |
| SEO | Per-route title and description via `Seo`, OG card regenerated, Person structured data | `tools/verify-build.mjs` |

## Roadmap

Order matters, so it is numbered. All seven landed; see `git log` on
`feat/design-system-refresh-rk` for one commit per phase.

1. **Truth fixes.** byrd date on the homepage, the years claim, `CLAUDE.md` rewritten to match
   master. No design dependency; ships alone.
2. **Tokens and type.** Rewrite `_tokens.scss`, add Archivo, delete Instrument Serif, retune
   the scale for a sans display.
3. **Layout shell.** `PageRail`, header, footer, the two-track grid and its sub-1024px
   behaviour.
4. **SystemGraph.** The signature component, data-driven, with the homepage and both
   architecture case studies as consumers.
5. **Pages.** Home, projects, case study, writing, ai, about against the new shell.
6. **Case-study spine.** `DecisionCard`, `MetricList`, rail metadata wired to front matter.
7. **Quality gate.** Contrast check, tab pass, heading-order verifier, new OG card, structured
   data, budgets green.

## Open questions

1. The years framing: "12 years building software, 15 in the industry", or no number?
2. byrd metrics beyond what the case study already states (three dashboards, five consecutive
   major Angular upgrades, versioned releases with Storybook). Team size, release cadence and
   number of consuming libraries would suit the rail if they can be stated.
3. Availability wording. Garden leave ends 2026-09-30. State "available from October 2026", or
   keep it vague?

## Implementation notes

Recorded as the phases landed, so the spec above does not quietly disagree with the code.

- **`DecisionCard` is not an Angular component.** Case studies are markdown, so the decisions
  live inside compiled HTML that a template cannot instantiate into. It is a pipeline transform
  (`markDecisions` in `tools/lib/content.mjs`) plus prose styles. The trigger is the bold-lead
  convention the case studies already use: a paragraph opening with bold text ending in a full
  stop. Only `distribution-erp` uses that convention today, so it is the only case study with
  cards. Adding them elsewhere is a markdown edit, not a code change.
- **`SystemGraph` nodes are not links**, which contradicts the accessibility table's "graph nodes
  are real links in DOM order". There is no page behind "Admin dashboard". The svg is
  `role="img"` with a generated description instead, and a test asserts the graph contains no
  anchors.
- **No federkleid version numbers.** The graph supports an optional version per node and uses it
  for `ngx-gerber@0.1.1`, which is checkable on npm. federkleid's release numbers are not public,
  so its nodes carry none. This costs the diagram its sharpest point, since one consumer being
  deliberately behind is the argument for versioning. Still outstanding.
- **`--measure-prose` was measured, not assumed.** 68ch rendered 96 characters per line because
  `ch` is the advance of "0" and Geist's zero is much wider than its average lowercase. It is
  50ch, measured at 72. The main track is deliberately wider than the prose measure so code
  blocks, the headline and the Gerber viewer are not squeezed.
- **No rail on `/` or `/projects`.** A rail carrying one derived count is a section that exists
  because the template has one. Those pages use the `is-solo` variant, which keeps the shell
  width and aligns left so the text starts on the same line as the header and the rail elsewhere.
- **The homepage rail was built and reverted.** Moving role, location and availability into it
  broke an existing spec asserting availability reads as a sentence rather than a pill, and that
  spec documents a deliberate earlier decision. The homepage keeps the sentence.
- **The global reduced-motion rule was wrong.** It shortened durations but left
  `animation-iteration-count`, so an infinite animation would restart forever and flicker instead
  of stopping. It now pins the count to 1.
