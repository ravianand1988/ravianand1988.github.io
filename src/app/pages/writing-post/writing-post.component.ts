import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-writing-post',
  imports: [DatePipe],
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

  // The body is first-party markdown compiled at build time. There is no
  // user-input path into it. Angular's sanitizer strips the inline styles
  // Shiki emits for code blocks, which would leave highlighting unstyled, so
  // the trusted-HTML bypass is deliberate here and safe for this content only.
  readonly body = computed(() => {
    const post = this.post();
    return post ? this.sanitizer.bypassSecurityTrustHtml(post.html) : null;
  });
}
