import { Injectable } from '@angular/core';
import { GeneratedEntry, posts, projects } from '../../generated/content';

@Injectable({ providedIn: 'root' })
export class ContentService {
  allPosts(): GeneratedEntry[] {
    return posts;
  }

  recentPosts(count: number): GeneratedEntry[] {
    return posts.slice(0, count);
  }

  postBySlug(slug: string): GeneratedEntry | undefined {
    return posts.find((post) => post.slug === slug);
  }

  postsByPillar(pillar: string | null): GeneratedEntry[] {
    return pillar ? posts.filter((post) => post.pillar === pillar) : posts;
  }

  allProjects(): GeneratedEntry[] {
    return projects;
  }

  projectBySlug(slug: string): GeneratedEntry | undefined {
    return projects.find((project) => project.slug === slug);
  }
}
