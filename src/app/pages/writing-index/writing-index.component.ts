import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/content';
import { Seo } from '../../core/seo';

const PILLARS = ['ai-engineering', 'frontend-architecture', 'migrations', 'leading-teams'] as const;

@Component({
  selector: 'app-writing-index',
  imports: [RouterLink, DatePipe],
  templateUrl: './writing-index.component.html',
  styleUrl: './writing-index.component.scss',
})
export class WritingIndexComponent {
  private readonly content = inject(ContentService);

  readonly pillars = PILLARS;
  readonly active = signal<string | null>(null);
  readonly posts = computed(() => this.content.postsByPillar(this.active()));

  constructor() {
    inject(Seo).set({
      title: 'Writing, Ravi Anand Kumar',
      description:
        'Essays on frontend architecture, migrations, design systems and AI-assisted engineering.',
      path: '/writing',
    });
  }

  select(pillar: string | null): void {
    this.active.set(this.active() === pillar ? null : pillar);
  }
}
