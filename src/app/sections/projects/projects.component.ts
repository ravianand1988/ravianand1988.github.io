import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  standalone: true,
  imports: [CommonModule],
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
  ];
}
