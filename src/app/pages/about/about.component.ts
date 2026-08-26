import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  constructor() {
    inject(Seo).set({
      title: 'About Ravi Anand Kumar',
      description:
        'Frontend Tech Lead in Berlin. Twelve years in software, the last seven in frontend architecture.',
      path: '/about',
    });
  }
}
