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
        "Led frontend architecture and technical direction for byrd's B2B logistics platform (Partner, Customer, and Admin dashboards) serving 500+ customers and processing 100,000+ orders/month, spanning inbound, outbound, returns, and shipment workflows",
        'Drove major platform initiatives end-to-end: migrating domain state (auth, product, lot, storage) out of per-app code into shared versioned packages, and the Storage Zones feature that optimized warehouse picking',
        'Kept the Frontend codebase current through five consecutive major Angular upgrades (v13 → v17), including the typed-forms migration',
        "Contributed to and regularly reviewed pull requests for byrd's Java-based Android warehouse app (inbound/outbound, putaway, and returns picking/packing), then led its migration from Java to Kotlin",
        'Maintained Selenium-based end-to-end test coverage across the frontend projects; currently completing a Playwright fundamentals course to modernize the E2E stack',
        'Interviewed, hired, and onboarded Frontend engineers; managed and mentored a team of 4-6 engineers through code review, pairing, and knowledge-sharing sessions',
        "Authored and maintain byrd_claude_plugins — a Claude Code plugin repo with separate frontend/backend skill packages (branch creation, ticket refinement, implementation planning, PR creation/review, database migrations, RC package publishing) — used daily for engineering workflows",
        'Built an in-house tool to manage multi-locale i18n translation files against a third-party translation platform, streamlining localization across the team',
        'Owned CI/CD pipelines (GitHub → CI/CD → Docker → AWS) and automated the release/deployment tagging process, working alongside DevOps on containerised delivery (Docker, Kubernetes)',
        "Own and publish federkleid, byrd's shared Angular design-system library (Storybook), plus a suite of internal libraries (@getbyrd/core, delivery, fulfill, inventory, returns, warehouse, etc.) consumed across the Customer, Partner, and Admin dashboard frontends, with regular versioned RC releases",
        'Led a hackathon project on invoice management; collaborated closely with backend and product teams on scalable APIs and system architecture',
      ],
    },
    {
      company: 'Assistr Digital Health Systems GmbH',
      location: 'Berlin, Germany',
      role: 'Software Developer',
      dates: 'Sep 2017 – Oct 2019',
      bullets: [
        'Joined AssistMe, a healthcare platform enabling independent living for elderly people and people in need of care, at inception and owned software delivery from early R&D through to a production-ready system',
        'Designed and built REST API services, core backend modules, and admin panels on Django/Django REST Framework and PostgreSQL, deployed on AWS',
        'Built the Vue.js/ES6 frontend consuming those APIs test-first with Jest, establishing the project architecture and testing practice',
      ],
    },
    {
      company: 'AppFlow Solutions',
      location: 'Faridabad, India',
      role: 'Software Engineer',
      dates: 'Aug 2015 – Sep 2017',
      bullets: [
        'Built DIM (Data Input Manager), a web-based intranet application for a US hospitality management client, using C# on ASP.NET MVC',
        'Developed the Profit & Loss synopsis module and integrated Azure AD authentication, working with GrapeCity SpreadJS and DevExpress components',
        'Built an automated file-processing pipeline with Azure Logic Apps and Azure Functions, moving daily files from email into Azure BLOB storage',
      ],
    },
  ];
}
