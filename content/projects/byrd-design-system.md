---
title: 'federkleid: one design system, four applications'
description: 'Owning the shared Angular design system and the eight domain packages behind byrd''s four production frontends, and moving domain state out of per-app code.'
date: 2026-08-20
pillar: frontend-architecture
stack:
  - 'Angular'
  - 'TypeScript'
  - 'RxJS, NgRx'
  - 'Storybook'
  - 'Versioned npm packages'
metrics:
  - label: 'Consuming apps'
    value: '4'
  - label: 'TypeScript on it'
    value: '~309k lines'
  - label: 'Components'
    value: '77'
  - label: 'Major Angular upgrades'
    value: '4'
---

byrd ran four production frontends against the same logistics platform: a Customer
dashboard for online sellers, a Partner dashboard for warehouse operators, an Admin
dashboard, and a white-label Returns Portal. Four apps, one product, and the usual
consequence. A component solved in one of them solved nothing in the other three.

I was the top contributor to federkleid, the shared Angular design system all four
consume: 77 components, 166 icons, runtime theming, and the form and data-table
frameworks every screen is assembled from. Around it sit eight co-versioned Angular
packages holding the domain logic, published on a regular release cadence with
Storybook as the reference. Roughly 309,000 lines of TypeScript are built on that
platform, which is the number that makes the rest of this worth doing.

## The part that mattered more than components

A design system stops people copying buttons. It does not stop them copying logic.

The deeper problem was that domain state, things like auth, product, lot and storage,
lived in each application separately. Four implementations of the same concepts,
drifting apart at four different speeds. So the more valuable piece of work was
moving that state out of per-app code and into shared versioned packages, which meant
a change to how a lot is represented happened once and arrived everywhere through a
version bump. It went one domain at a time behind a flag, deleting the legacy code
behind it rather than leaving both paths alive.

Versioned is the important word. Shared code that everyone consumes from `main` is
not a library, it is a distributed monolith with extra steps. Release candidates and
real version numbers are what let four applications upgrade on their own schedule
instead of all breaking together.

## Three subsystems I owned outright

The type-safe forms layer, meaning the form extensions, the validators and sixteen
field components. The list and filter framework that every data table in every app is
built from. And the icon system. Those are the pieces where a bad decision is
expensive to walk back, because every screen inherits it.

## Keeping it upgradable

Over that period the codebase went through four major Angular upgrades, v11, v14, v16
and v17, including the typed-forms migration. Each one landed across six repositories
as a single coordinated migration, which is the only reason the shared packages stayed
shareable. That is not glamorous work and it is why the platform stayed buildable. A
shared design system multiplies the cost of falling behind: every consuming
application inherits your framework version, so a library that stops upgrading freezes
four products at once.

The same six repositories got their linting centralised into shared configs, and a
build tool that gives all four apps the same versioned build from one command, with a
CI gate that fails any build containing a skipped spec across roughly 9,900 tests.

## What I would tell someone starting this

Publish the versioned package before you have consumers asking for it. Retrofitting
release discipline onto shared code that four teams already import from a branch is
significantly harder than starting with it, and the conversation is much worse.
