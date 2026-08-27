import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { SystemGraphComponent } from '../../features/system-graph/system-graph.component';
import { FEDERKLEID_GRAPH } from '../../features/system-graph/graphs';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, SystemGraphComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly content = inject(ContentService);

  // The hero graph is federkleid, because it is the clearest instance of the
  // thing the whole site is about and it is the work he is proudest of.
  readonly graph = FEDERKLEID_GRAPH;

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
