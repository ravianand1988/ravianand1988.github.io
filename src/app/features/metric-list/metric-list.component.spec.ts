import { TestBed } from '@angular/core/testing';
import { MetricListComponent } from './metric-list.component';
import { projects, posts } from '../../../generated/content';

function render(metrics: unknown) {
  const fixture = TestBed.createComponent(MetricListComponent);
  fixture.componentRef.setInput('metrics', metrics);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('MetricListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MetricListComponent] }).compileComponents();
  });

  it('renders each metric as a label and a value', () => {
    const el = render([
      { label: 'Releases', value: '15' },
      { label: 'Pull requests', value: '~100' },
    ]);
    expect(Array.from(el.querySelectorAll('dt')).map((n) => n.textContent?.trim())).toEqual([
      'Releases',
      'Pull requests',
    ]);
    expect(Array.from(el.querySelectorAll('dd')).map((n) => n.textContent?.trim())).toEqual([
      '15',
      '~100',
    ]);
  });

  it('renders nothing when a piece has no figures, rather than an empty strip', () => {
    const el = render([]);
    expect(el.querySelector('.metrics')).toBeNull();
  });

  it('uses a description list, so each value is tied to its label', () => {
    const el = render([{ label: 'Apps', value: '3' }]);
    expect(el.querySelector('dl')).not.toBeNull();
    expect(el.querySelector('.metric dt')).not.toBeNull();
    expect(el.querySelector('.metric dd')).not.toBeNull();
  });
});

describe('case study metrics', () => {
  // The guard that matters most on this site: a figure nobody can find in the
  // prose is a claim with no source. This does not prove the numbers are right,
  // but it does stop a metric being added with no label or no value, and it
  // pins which entries are allowed to carry figures at all.
  it('gives every metric a label and a value', () => {
    for (const entry of [...projects, ...posts]) {
      for (const metric of entry.metrics) {
        expect(metric.label.trim().length).toBeGreaterThan(0);
        expect(String(metric.value).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('carries figures on the case studies and none on the posts', () => {
    expect(projects.every((p) => p.metrics.length > 0)).toBe(true);
    expect(posts.every((p) => p.metrics.length === 0)).toBe(true);
  });

  it('states a stack for every case study', () => {
    for (const project of projects) {
      expect(project.stack.length).toBeGreaterThan(0);
    }
  });
});
