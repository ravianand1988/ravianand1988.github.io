import { Component } from '@angular/core';

interface ProjectEntry {
  title: string;
  description: string;
  stack: string[];
  linkLabel?: string;
  linkUrl?: string;
  note?: string;
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  projects: ProjectEntry[] = [
    {
      title: 'AI-Assisted Job Finder & Tracker',
      description:
        'A personal full-stack app that pulls job postings from multiple sources, scores them against a real skills/experience profile, and tracks applications through a Kanban pipeline — including a per-job CV tailoring and ATS keyword-match tool with .docx export. Built end-to-end with Claude Code.',
      stack: ['Angular', 'Fastify', 'TypeScript', 'Prisma', 'SQLite'],
      note: 'Repository private for now',
    },
    {
      title: 'Family Business ERP — FMCG Wholesale & Distribution',
      description:
        "Solo-built and maintained since 2018, in continuous production use since 2019 running day-to-day operations — inventory, purchase/sales orders, sales returns, and GST invoicing — for a regional FMCG wholesale distributor working with ~90 consumer brands. Now leading a zero-downtime strangler-pattern migration to Angular + ASP.NET Core/EF Core (with a planned SQL Server → PostgreSQL cutover), porting GST/invoicing business rules into a proper service layer while the legacy app and new modules run concurrently against the same database.",
      stack: ['Angular (in progress)', 'ASP.NET Core', 'EF Core', 'SQL Server → PostgreSQL'],
      note: 'Repository private for now',
    },
    {
      title: 'Gerber (PCB) Viewer',
      description:
        'A Gerber/RS-274X file parser and renderer, with a shared parsing core ported across a cross-platform .NET library, a WPF desktop shell, and an Angular web app that parses and renders directly in the browser via Canvas.',
      stack: ['Angular', '.NET', 'TypeScript', 'C#'],
      note: 'Repository private for now',
    },
    {
      title: 'ngx-jsbarcode',
      description:
        'An open-source Angular library wrapping JsBarcode for rendering 1-D barcodes as Angular components.',
      stack: ['Angular', 'TypeScript'],
      linkLabel: 'View on GitHub',
      linkUrl: 'https://github.com/ravianand1988/ngx-jsbarcode',
    },
  ];
}
