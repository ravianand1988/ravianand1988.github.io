import { RenderMode, ServerRoute } from '@angular/ssr';
import { projectSlugs, writingSlugs } from '../generated/slugs';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'writing/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return writingSlugs.map((slug) => ({ slug }));
    },
  },
  {
    path: 'projects/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return projectSlugs.map((slug) => ({ slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
