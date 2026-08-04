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
      dates: 'Oct 2019 – Jul 2026',
      bullets: [
        'Promoted from Senior Frontend Engineer to Frontend Tech Lead (Aug 2024), recognized for technical leadership and team impact',
        "Led frontend architecture and technical direction for byrd's B2B logistics platform (Partner, Customer, and Admin dashboards), spanning inbound, outbound, returns, and shipment workflows",
        'Drove major platform initiatives end-to-end: the V2→V3 shipment/returns architecture migration and the Storage Zones feature that optimized warehouse picking',
        'Kept the Frontend codebase current through five consecutive major Angular upgrades (v13 → v17), including the typed-forms migration',
        'Interviewed, hired, and onboarded Frontend engineers; mentored peers and junior engineers through code review, pairing, and knowledge-sharing sessions',
        "Authored and maintain byrd_claude_plugins — a Claude Code plugin repo with separate frontend/backend skill packages (branch creation, ticket refinement, implementation planning, PR creation/review, database migrations, RC package publishing) — used daily for engineering workflows",
        'Built an in-house tool to manage multi-locale i18n translation files against a third-party translation platform, streamlining localization across the team',
        'Owned CI/CD pipelines (GitHub → CI/CD → Docker → AWS) and automated the release/deployment tagging process',
        "Own and publish federkleid, byrd's shared Angular design-system library (Storybook), plus a suite of internal libraries (@getbyrd/core, delivery, fulfill, inventory, returns, warehouse, etc.) consumed across the Customer, Partner, and Admin dashboard frontends, with regular versioned RC releases",
        'Led a hackathon project on invoice management; collaborated closely with backend and product teams on scalable APIs and system architecture',
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
