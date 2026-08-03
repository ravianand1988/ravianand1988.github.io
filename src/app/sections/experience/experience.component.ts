import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ExperienceEntry {
  company: string;
  location: string;
  role: string;
  dates: string;
  bullets: string[];
}

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.scss',
})
export class ExperienceComponent {
  entries: ExperienceEntry[] = [
    {
      company: 'byrd technologies GmbH',
      location: 'Berlin, Germany',
      role: 'Frontend Tech Lead (previously Sr. Frontend Engineer, Frontend Engineer)',
      dates: 'Oct 2019 – 2026',
      bullets: [
        'Led frontend architecture and technical direction for a large-scale B2B logistics platform',
        'Managed and mentored a team of frontend engineers — hiring, onboarding, and performance guidance',
        'Defined coding standards, component-driven architecture, and code review practices across teams',
        'Built and maintained reusable Angular component libraries and a shared design system (Storybook)',
        'Owned CI/CD pipelines and deployment processes (GitHub → CI/CD → Docker → AWS)',
        'Championed AI-assisted engineering — integrated Claude Code, GitHub Copilot, and OpenAI Codex into the team’s daily workflow, and built custom Claude Code Skills/plugins and multi-agent automation for frontend tasks',
      ],
    },
    {
      company: 'Assistr Digital Health Systems GmbH',
      location: 'Berlin, Germany',
      role: 'Software Developer',
      dates: 'Sep 2017 – Sep 2019',
      bullets: [
        'Built full-stack features for a healthcare platform using Vue.js, Django, and PostgreSQL',
        'Implemented component-based frontend architecture and REST APIs',
      ],
    },
    {
      company: 'AppFlow Solutions',
      location: 'Faridabad, India',
      role: 'Software Engineer',
      dates: 'Aug 2015 – Sep 2017',
      bullets: ['Built an ERP SaaS application for a US client, including role-based access and financial modules'],
    },
  ];
}
