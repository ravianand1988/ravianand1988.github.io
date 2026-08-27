import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { PageRailComponent, RailGroup, RailSection } from '../../layout/page-rail/page-rail.component';
import { Seo } from '../../core/seo';
import { GerberDemoComponent } from '../../features/gerber-demo/gerber-demo.component';
import { SystemGraphComponent } from '../../features/system-graph/system-graph.component';
import { PROJECT_GRAPHS } from '../../features/system-graph/graphs';

/**
 * Case studies are markdown, so an Angular component cannot live inside the
 * rendered prose. The one case study that has a live demo names itself here and
 * the demo renders below the article instead. Deliberately a single special case
 * rather than a general embedding mechanism, because there is exactly one demo.
 */
const DEMO_SLUG = 'gerber-viewer';

const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

@Component({
  selector: 'app-project-detail',
  imports: [GerberDemoComponent, PageRailComponent, SystemGraphComponent],
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

  /**
   * Not every case study has a core-and-consumers shape. The ERP migration is a
   * sequencing story, so it gets no graph rather than a forced one.
   */
  readonly graph = computed(() => PROJECT_GRAPHS[this.slug()] ?? null);

  readonly railGroups = computed<RailGroup[]>(() => {
    const entry = this.project();
    if (!entry) return [];
    return [
      { label: 'Pillar', values: [entry.pillar.replace(/-/g, ' ')] },
      { label: 'Written', values: [MONTH_YEAR.format(new Date(entry.date))] },
    ];
  });

  // Level 2 only. The case studies are almost entirely h2, and mixing in the
  // occasional h3 would make the list look nested without earning it.
  readonly railSections = computed<RailSection[]>(
    () =>
      this.project()
        ?.headings.filter((heading) => heading.level === 2)
        .map(({ id, text }) => ({ id, text })) ?? [],
  );

  // Same rationale as WritingPostComponent: first-party markdown compiled at
  // build time, no user-input path, and the sanitizer would strip Shiki's
  // inline styles.
  readonly body = computed(() => {
    const project = this.project();
    return project ? this.sanitizer.bypassSecurityTrustHtml(project.html) : null;
  });
}
