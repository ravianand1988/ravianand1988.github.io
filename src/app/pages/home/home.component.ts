import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly content = inject(ContentService);

  readonly work = this.content.allProjects().slice(0, 3);
  readonly recent = this.content.recentPosts(3);

  constructor() {
    inject(Seo).set({
      title: 'Ravi Anand Kumar, Frontend Tech Lead',
      description:
        'I take frontends that have outgrown their structure and make them workable again. Frontend Tech Lead in Berlin.',
      path: '/',
    });
  }
}
