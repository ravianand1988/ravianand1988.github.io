import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-project-detail',
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

  // Same rationale as WritingPostComponent: first-party markdown compiled at
  // build time, no user-input path, and the sanitizer would strip Shiki's
  // inline styles.
  readonly body = computed(() => {
    const project = this.project();
    return project ? this.sanitizer.bypassSecurityTrustHtml(project.html) : null;
  });
}
