---
title: 'Distribution ERP: Windows Forms to web'
description: 'Replacing a desktop app that ran an FMCG wholesale distributor since 2017, module by module, without the business stopping.'
date: 2026-08-26
pillar: migrations
stack:
  - 'ASP.NET Core on .NET 10'
  - 'EF Core'
  - 'SQL Server'
  - 'Angular 21'
  - 'Angular Material, AG Grid'
  - 'IIS on one Windows host'
metrics:
  - label: 'Brands served'
    value: '~90'
  - label: 'Frontend'
    value: '32,000 lines'
  - label: 'Releases'
    value: '15'
  - label: 'Pull requests'
    value: '~100'
---

For most of a decade, an FMCG wholesale distributor working with around 90 consumer
brands ran its entire operation on a Windows desktop application I wrote. GST
invoicing, stock, purchase and sales orders, returns, customer and supplier ledgers.
It worked. Every invoice the business issued came out of it.

It was also a .NET Framework 4.5.2 WinForms application with no authentication, no
tests and no database migrations, and its business rules lived inside form event
handlers.

That last part is the whole story. The three files where GST calculation, invoice
totalling and stock movement actually happened ran to roughly 1,500, 1,700 and 1,200
lines. Each repository opened its own `DbContext` with no shared unit of work, so a
multi-entity operation was not transactional. The schema existed only as hand-written
SQL scripts, and the entity model was reverse-engineered from the live database.

It is now retired. The business runs on an Angular and ASP.NET Core web application
instead, and it never stopped trading during the switch.

## The hard part was never the CRUD

Anyone can rewrite a customer form. The risk sat in the rules, because the rules were
expressed as UI code. GST logic in India is not something you reconstruct from
memory, and the business had eight years of edge cases quietly encoded in those event
handlers: scheme discounts, dealer discounts, taxable amounts per line, GST reversal
on returns.

Recovering those rules was a first-class workstream, not a side effect of the
rewrite.

## Two decisions that made it survivable

**Staying in C#.** The obvious move for a 2026 rewrite is a different backend
language. I kept C# specifically so the rules would port rather than be re-derived.
`decimal` money math carries over exactly, entity classes move from EF6 to EF Core
with small configuration changes, and the GST and invoicing logic transfers close to
line for line into a real service layer. A cross-language rewrite would have turned
every one of those rules into a translation with its own opportunity to be subtly
wrong, in financial code, for a live business.

**Sequencing the database engine change last.** The target was PostgreSQL. It was
also the one thing that could not move early, and the reason is worth stating
plainly: while the desktop app was still live it kept writing to the same SQL Server
database, and it speaks only SQL Server. So SQL Server stayed the shared system of
record through every phase, with EF Core connecting to it, and the engine switch was
deliberately deferred to the end.

The alternative was running both engines in parallel with change-data-capture
replication between them during the overlap. I wrote that option down and rejected
it. Bidirectional replication of financial data, to save some ordering
inconvenience, is a bad trade.

## What shipped

The web application covers every module the desktop app had: sales and invoicing,
purchases, purchase returns, products and stock, measurement units, customers and
suppliers with their account ledgers, multi-business context, and reporting. It also
has things the desktop app never did, including an expenses module that keeps the
owner's personal spending out of net profit, and a general ledger.

Underneath: ASP.NET Core on .NET 10 with EF Core and real migrations against a
versioned schema baseline, ASP.NET Core Identity with role-based access control and
public registration deliberately disabled, and server-side PDF and Excel generation
that replaced the desktop stack's report engine, PDF library and Office Interop
dependency. The frontend is an Angular 21 single-page app of roughly 32,000 lines,
using Angular Material and AG Grid, with linting and a test setup the original never
had.

Integration tests run against a real SQL Server in a container rather than an
in-memory fake, because the things worth testing here are the queries and the
migrations.

Fifteen releases so far, across a hundred-odd pull requests.

## The other engineer was a model

Most of this migration was written alongside Claude Code, and the commit history says
so rather than quietly not mentioning it. What it bought was not typing speed. It was
the rules recovery: reading 1,500-line event handlers and turning them into a service
layer with tests is exactly the tedious, high-attention work where a second reader who
never gets bored earns its place.

The decisions above are still mine. Staying in C#, deferring Postgres, rejecting
bidirectional replication. A model does not tell you which trade is the bad one.

## One box, on purpose

It runs on a single Windows 11 machine behind IIS as a reverse proxy, with the API
and the SPA as services on that host. Not a cloud deployment.

This is a family business. The load is a handful of concurrent users. Paying monthly
for managed infrastructure to serve them would be spending real money to feel modern.
What it does have is a nightly backup script that dumps both databases, proves each
one is readable with a verify pass before copying it off the container, prunes old
copies past a retention window, and lands the result in cloud storage automatically.

The interesting engineering decision was not which cloud. It was making sure a
one-machine deployment cannot lose eight years of invoices.

## What is left

The PostgreSQL cutover, and it is now unblocked. It was only ever sequenced last
because the desktop app needed SQL Server, and the desktop app is gone. What remains
is a provider swap, a data port and some type fix-ups.
