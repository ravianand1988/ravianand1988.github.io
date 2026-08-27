import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo';
import { PageRailComponent, RailGroup, RailSection } from '../../layout/page-rail/page-rail.component';

@Component({
  selector: 'app-ai',
  imports: [PageRailComponent],
  templateUrl: './ai.component.html',
})
export class AiComponent {
  // Six skills and MIT are both stated in the page body, so the rail is
  // repeating verified facts rather than introducing new ones.
  readonly railGroups: RailGroup[] = [
    { label: 'Skills', values: ['6'] },
    { label: 'Licence', values: ['MIT'] },
    { label: 'Shape', values: ['One markdown file each', 'No code, no dependencies'] },
  ];

  // Hand-written ids, same as the about page. Kept in step by a spec.
  readonly railSections: RailSection[] = [
    { id: 'why-it-worked', text: 'Why it worked' },
    { id: 'the-public-version', text: 'The public version' },
    { id: 'the-six-skills', text: 'The six skills' },
  ];

  constructor() {
    inject(Seo).set({
      title: 'Building with AI, Ravi Anand Kumar',
      description:
        'A Claude Code plugin suite a real engineering team used every day, and the clean-room version of it.',
      path: '/ai',
    });
  }
}
