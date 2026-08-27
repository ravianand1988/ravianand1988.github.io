import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { PageRailComponent, RailGroup, RailSection } from '../../layout/page-rail/page-rail.component';
import { Seo } from '../../core/seo';

const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

@Component({
  selector: 'app-writing-post',
  imports: [PageRailComponent],
  templateUrl: './writing-post.component.html',
})
export class WritingPostComponent {
  readonly slug = input.required<string>();

  private readonly content = inject(ContentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(Seo);

  readonly post = computed(() => {
    const found = this.content.postBySlug(this.slug());
    if (found) {
      this.seo.set({
        title: found.title,
        description: found.description,
        path: `/writing/${found.slug}`,
      });
    }
    return found;
  });

  readonly railGroups = computed<RailGroup[]>(() => {
    const entry = this.post();
    if (!entry) return [];
    return [
      { label: 'Pillar', values: [entry.pillar.replace(/-/g, ' ')] },
      { label: 'Published', values: [MONTH_YEAR.format(new Date(entry.date))] },
    ];
  });

  readonly railSections = computed<RailSection[]>(
    () =>
      this.post()
        ?.headings.filter((heading) => heading.level === 2)
        .map(({ id, text }) => ({ id, text })) ?? [],
  );

  // The body is first-party markdown compiled at build time. There is no
  // user-input path into it. Angular's sanitizer strips the inline styles
  // Shiki emits for code blocks, which would leave highlighting unstyled, so
  // the trusted-HTML bypass is deliberate here and safe for this content only.
  readonly body = computed(() => {
    const post = this.post();
    return post ? this.sanitizer.bypassSecurityTrustHtml(post.html) : null;
  });
}
