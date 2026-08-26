import { RenderMode, ServerRoute } from '@angular/ssr';
import { writingSlugs } from '../generated/slugs';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'writing/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return writingSlugs.map((slug) => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
