---
title: 'In a strangler migration, the database engine goes last'
description: 'Choosing the order of a migration is most of the design. Here is why the storage engine is almost always the final step, not the first.'
date: 2026-08-26
pillar: migrations
---

When people describe a strangler-pattern migration they usually describe the modules:
carve off one area, replace it, move to the next, retire the old system when nothing
points at it. That part is well understood.

What gets less attention is the ordering constraint underneath it, which is where the
actual design lives. And the most common mistake I see is treating the database engine
as an early decision.

## The constraint, stated plainly

In a strangler migration there is a period, often a long one, where both systems are
live. Both are serving real users. Both are writing.

If they share a database, and they usually must, then the database has to speak a
language both of them understand. Your new system can use anything. Your old system
cannot change at all, because the entire premise is that you are not touching it.

So the shared storage engine is pinned by the *oldest* system in the picture, for as
long as that system is alive.

## What that meant concretely

I recently finished replacing a WinForms desktop application that had been running a
distribution business since 2017. The target was PostgreSQL on Linux containers. The
desktop app was .NET Framework with Entity Framework 6, and it speaks SQL Server and
nothing else.

Which fixed the sequence with no room to argue:

1. SQL Server stays the shared system of record for every phase while the desktop app
   is live.
2. The new backend connects to that same SQL Server through EF Core.
3. Modules move across one at a time. Both applications read and write the same tables.
4. The desktop app is retired only when nothing depends on it.
5. *Then* the engine changes.

Because data access goes through EF Core, that last step is mostly a provider swap plus
a data port and some type fix-ups. It is a real piece of work, but it is a contained one,
and crucially it happens when exactly one application owns the data.

## The tempting alternative, and why not

There is an option that lets you have PostgreSQL early: run both engines in parallel and
replicate between them with change-data-capture during the overlap.

I wrote that option down and rejected it. It means bidirectional replication of
financial records, invoices and stock and ledger entries, with two writers, for months,
so that a technology preference can be satisfied sooner. Every conflict-resolution edge
case becomes a potential wrong number on a tax invoice.

The cost of waiting was some ordering inconvenience. The cost of not waiting was a class
of bug I would not be able to detect quickly and could not undo. That is not a close
call, and I think people talk themselves into it because parallel replication sounds
more sophisticated than patience.

## The general rule

Sequence a migration by what is *pinned*, not by what is exciting.

Write down every constraint the old system imposes while it is still breathing, and
notice that most of them expire the moment it is switched off. Anything in that category
should be scheduled after the switch-off, not before, because doing it earlier means
paying for compatibility with a system you are about to delete.

The storage engine is almost always in that category. So is anything about deployment
topology, and often authentication too.

Do the parts that are genuinely blocked. Defer the parts that are only blocked by a
corpse you have not buried yet.
