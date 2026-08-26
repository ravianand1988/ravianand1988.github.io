import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-ai',
  templateUrl: './ai.component.html',
})
export class AiComponent {
  constructor() {
    inject(Seo).set({
      title: 'Building with AI, Ravi Anand Kumar',
      description:
        'A Claude Code plugin suite a real engineering team used daily, for ticket refinement, implementation planning, PR review and database migrations.',
      path: '/ai',
    });
  }
}
