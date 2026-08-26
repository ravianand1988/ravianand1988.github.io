import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export const SITE_URL = 'https://ravianand1988.github.io';
const OG_IMAGE = `${SITE_URL}/assets/og-default.png`;

export interface PageMeta {
  title: string;
  description: string;
  path: string;
}

@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set({ title, description, path }: PageMeta): void {
    const url = `${SITE_URL}${path}`;
    this.title.setTitle(title);

    // updateTag overwrites a matching tag rather than appending, which keeps
    // prerendered pages from accumulating duplicates across navigations.
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  }
}
