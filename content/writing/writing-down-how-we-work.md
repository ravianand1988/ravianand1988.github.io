---
title: 'The AI tooling that stuck was the boring part'
description: 'I built a plugin suite my team used every day. The useful thing about it had almost nothing to do with the model.'
date: 2026-08-22
pillar: ai-engineering
---

I built a set of Claude Code skills for my engineering team at byrd, and the team used
them every working day. Not once, in a demo, to applause. Daily, as part of how work got
done.

I have been trying to work out why those stuck when so much AI tooling does not, and I
do not think the answer is flattering to the technology.

## What was in it

Skills for the parts of the job everyone did slightly differently: refining a vague
ticket into something with scope and acceptance criteria, producing an implementation
plan from the affected repositories before any code got written, creating a pull request
that actually fills in the repository's own template, reviewing changes against our
standards, creating and verifying database migrations, naming branches to our
convention, publishing release candidates.

Read that list again and notice what is on it. None of it is clever. All of it is
things a team already decided once and then kept re-deciding badly.

## The insight, such as it is

Each of those skills is a written-down decision.

Our branch naming convention existed before the tooling. It lived in someone's memory,
a Confluence page nobody opened, and the shape of whatever branch you last looked at.
Our PR template existed. People filled in about a third of it. Our migration
conventions existed, and got applied correctly by the two people who had been burned.

The skill did not invent any of that. It encoded it, in a form that got applied
consistently without anyone having to remember or care.

Which means the value was mostly in the writing-down. The model was the delivery
mechanism.

## Why this is the part people skip

Because writing down how you work is unglamorous, and because it forces arguments.

You cannot encode a convention you have not agreed on. The moment you try to write the
PR review skill you discover the team does not actually share a standard, it has three
overlapping ones and a strong personality per standard. That conversation is the work.
The tooling is just what makes the outcome of the conversation stick.

Every team I have seen get poor results from AI tooling was trying to skip that step:
pointing a model at an undefined process and being disappointed that the output was
undefined too.

## What I would do differently

Start with the smallest convention nobody disputes. Branch naming, probably. Ship that,
let people feel it work, then use the credibility to have the harder conversation about
what a code review is for.

Going the other way, leading with the ambitious thing, means the first artifact the team
sees is a plausible-looking implementation plan for a ticket that was never properly
scoped. That confirms every suspicion they already had.

The tooling is easy. The agreement is the hard part, and it is also the part that keeps
paying after the tooling changes.
