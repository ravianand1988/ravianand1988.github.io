import { Component, inject } from '@angular/core';
import { Seo } from '../../core/seo';
import { PageRailComponent, RailGroup, RailSection } from '../../layout/page-rail/page-rail.component';

@Component({
  selector: 'app-about',
  imports: [PageRailComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  // Engineering roles start Dec 2013, which is twelve years. The industry
  // figure counts from the 2011 training role. Both are checkable against the
  // dates listed further down this page, which is the point of putting them
  // side by side.
  readonly railGroups: RailGroup[] = [
    { label: 'Based', values: ['Berlin'] },
    { label: 'Building software', values: ['12 years'] },
    { label: 'In the industry', values: ['15 years'] },
    { label: 'Languages', values: ['Hindi native', 'English fluent', 'German B1'] },
  ];

  // These ids are written by hand in the template, unlike the markdown pages
  // where the content pipeline stamps them. A spec asserts the two stay in
  // step, because nothing else would catch a rename.
  readonly railSections: RailSection[] = [
    { id: 'byrd', text: 'byrd technologies' },
    { id: 'assistr', text: 'Assistr' },
    { id: 'appflow', text: 'AppFlow Solutions' },
    { id: 'inf-india', text: 'INF India' },
    { id: 'teaching', text: 'Teaching' },
    { id: 'practicalities', text: 'Practicalities' },
  ];

  constructor() {
    inject(Seo).set({
      title: 'About Ravi Anand Kumar',
      description:
        'Frontend Tech Lead in Berlin. Twelve years in software, the last six in frontend architecture.',
      path: '/about',
    });
  }
}
