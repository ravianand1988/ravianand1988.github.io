import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Ravi Anand Kumar, Frontend Tech Lead',
  },
  {
    path: 'writing',
    loadComponent: () =>
      import('./pages/writing-index/writing-index.component').then((m) => m.WritingIndexComponent),
  },
  {
    path: 'writing/:slug',
    loadComponent: () =>
      import('./pages/writing-post/writing-post.component').then((m) => m.WritingPostComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found',
  },
];
