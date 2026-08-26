---
title: 'Gerber viewer: one parser, three front ends'
description: 'An RS-274X parser with a shared core, rendered in a desktop shell and directly to canvas in the browser.'
date: 2026-08-10
pillar: frontend-architecture
---

Gerber is the file format printed circuit boards are manufactured from. RS-274X is a
plotter language from the 1980s that the electronics industry never replaced: a stream
of coordinates, aperture definitions and draw commands describing copper, solder mask
and silkscreen, layer by layer.

I wrote a parser and renderer for it, then put the same parsing core behind three
different front ends: a cross-platform .NET library, a WPF desktop shell, and an
Angular application that parses the file and draws the board directly to canvas in the
browser with no server round trip.

## Why it is a good architecture problem

The parsing is genuinely non-trivial. Aperture macros, polygon fill modes, arc
interpolation and coordinate-format headers all have to be right before anything looks
like a circuit board, and getting them subtly wrong produces output that is plausible
rather than obviously broken.

But the interesting constraint was the shape of the code, not the format. A geometry
core with no rendering assumptions in it, and thin adapters that turn parsed geometry
into whichever drawing surface it is going to. Once the core knows nothing about how it
will be displayed, adding the browser target stops being a rewrite and becomes a
renderer.

That is the same problem as a design system, in a different costume: find the part
that does not care about its consumer, and keep it that way.

## Where it goes next

An interactive version of this belongs on this site rather than being described on it.
Drop in a Gerber file, watch the board render. That is a better argument than any
paragraph I can write about parsers, and it is the next thing I am building here.
