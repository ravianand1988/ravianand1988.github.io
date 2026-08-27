import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';
import { GerberDemoComponent } from '../../features/gerber-demo/gerber-demo.component';

/**
 * Case studies are markdown, so an Angular component cannot live inside the
 * rendered prose. The one case study that has a live demo names itself here and
 * the demo renders below the article instead. Deliberately a single special case
 * rather than a general embedding mechanism, because there is exactly one demo.
 */
const DEMO_SLUG = 'gerber-viewer';

@Component({
  selector: 'app-project-detail',
  imports: [GerberDemoComponent],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent {
  readonly slug = input.required<string>();

  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(Seo);

  readonly project = computed(() => {
    const found = this.content.projectBySlug(this.slug());
    if (found) {
      this.seo.set({
        title: found.title,
        description: found.description,
        path: `/projects/${found.slug}`,
      });
    }
    return found;
  });

  readonly showDemo = computed(() => this.slug() === DEMO_SLUG);

  // Same rationale as WritingPostComponent: first-party markdown compiled at
  // build time, no user-input path, and the sanitizer would strip Shiki's
  // inline styles.
  readonly body = computed(() => {
    const project = this.project();
    return project ? this.sanitizer.bypassSecurityTrustHtml(project.html) : null;
  });
}
