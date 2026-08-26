---
title: 'federkleid: one design system, three dashboards'
description: 'Owning the shared Angular design system behind byrd''s Partner, Customer and Admin dashboards, and moving domain state out of per-app code.'
date: 2026-08-20
pillar: frontend-architecture
---

byrd ran three separate frontend applications: a Customer dashboard, a Partner
dashboard and an Admin dashboard, all against the same logistics platform. Three
apps, one product, and the usual consequence. A component solved in one dashboard
solved nothing in the other two.

I owned and published federkleid, the shared Angular design system those three
applications consume, along with a suite of internal libraries around it, on a
regular versioned release cadence with Storybook as the reference.

## The part that mattered more than components

A design system stops people copying buttons. It does not stop them copying logic.

The deeper problem was that domain state, things like auth, product, lot and storage,
lived in each application separately. Three implementations of the same concepts,
drifting apart at three different speeds. So the more valuable piece of work was
moving that state out of per-app code and into shared versioned packages, which meant
a change to how a lot is represented happened once and arrived in all three
dashboards through a version bump.

Versioned is the important word. Shared code that everyone consumes from `main` is
not a library, it is a distributed monolith with extra steps. Release candidates and
real version numbers are what let three applications upgrade on their own schedule
instead of all breaking together.

## Keeping it upgradable

Over that period the codebase went through five consecutive major Angular upgrades,
including the typed-forms migration. That is not glamorous work and it is the reason
the platform stayed buildable. A shared design system multiplies the cost of falling
behind: every consuming application inherits your framework version, so a library
that stops upgrading freezes three products at once.

## What I would tell someone starting this

Publish the versioned package before you have consumers asking for it. Retrofitting
release discipline onto shared code that three teams already import from a branch is
significantly harder than starting with it, and the conversation is much worse.
