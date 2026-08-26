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
    path: 'projects',
    loadComponent: () =>
      import('./pages/projects-index/projects-index.component').then((m) => m.ProjectsIndexComponent),
  },
  {
    path: 'projects/:slug',
    loadComponent: () =>
      import('./pages/project-detail/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found',
  },
];
