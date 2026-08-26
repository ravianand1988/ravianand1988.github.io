import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-projects-index',
  imports: [RouterLink],
  templateUrl: './projects-index.component.html',
})
export class ProjectsIndexComponent {
  private readonly content = inject(ContentService);
  readonly projects = this.content.allProjects();

  constructor() {
    inject(Seo).set({
      title: 'Projects, Ravi Anand Kumar',
      description: 'Selected work: what it was, what I decided, and what shipped.',
      path: '/projects',
    });
  }
}
