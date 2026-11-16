import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-projects-index',
  imports: [RouterLink],
  templateUrl: './projects-index.component.html',
  // Same title column as the home page lists, so descriptions line up.
  styles: `
    .row-title {
      flex: 0 0 20ch;
    }
    #playground {
      margin-top: var(--space-5);
    }
  `,
})
export class ProjectsIndexComponent {
  private readonly content = inject(ContentService);
  readonly projects = this.content.allProjects();

  // Practice repos, not case studies: listed apart so they never read as
  // production work. Each one is deployed to GitHub Pages from its own repo.
  readonly playground = [
    {
      title: 'Angular components',
      description: 'Accordion, tabs and star rating as standalone Angular 22 components, built on signal inputs.',
      live: 'https://ravianand1988.github.io/ng-comps-rk/',
      source: 'https://github.com/ravianand1988/ng-comps-rk',
    },
    {
      title: 'React UI challenges',
      description: 'Dialog, data table, toast, gallery, autocomplete with request cancellation, and a nested comment thread, in React and TypeScript.',
      live: 'https://ravianand1988.github.io/fe-ts-challenges/',
      source: 'https://github.com/ravianand1988/fe-ts-challenges',
    },
    {
      title: 'Prompt library',
      description: 'Create, save and delete prompts. React 19 and TypeScript, SQLite behind a small API locally, browser storage on the live demo.',
      live: 'https://ravianand1988.github.io/prompt-library/',
      source: 'https://github.com/ravianand1988/prompt-library',
    },
  ];

  constructor() {
    inject(Seo).set({
      title: 'Projects, Ravi Anand Kumar',
      description: 'Selected work: what it was, what I decided, and what shipped.',
      path: '/projects',
    });
  }
}
