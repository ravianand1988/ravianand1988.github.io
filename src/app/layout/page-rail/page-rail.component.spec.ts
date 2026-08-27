import { TestBed } from '@angular/core/testing';
import { PageRailComponent } from './page-rail.component';

function render(inputs: Partial<{ groups: unknown; sections: unknown }>) {
  const fixture = TestBed.createComponent(PageRailComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PageRailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PageRailComponent] }).compileComponents();
  });

  it('renders each group as a label with its values', () => {
    const el = render({
      groups: [
        { label: 'Pillar', values: ['migrations'] },
        { label: 'Stack', values: ['.NET 10', 'EF Core'] },
      ],
    });
    expect(Array.from(el.querySelectorAll('.group-label')).map((n) => n.textContent?.trim())).toEqual(
      ['Pillar', 'Stack'],
    );
    expect(Array.from(el.querySelectorAll('.group-value')).map((n) => n.textContent?.trim())).toEqual(
      ['migrations', '.NET 10', 'EF Core'],
    );
  });

  it('links the on-this-page list to heading fragments', () => {
    const el = render({
      groups: [],
      sections: [
        { id: 'what-shipped', text: 'What shipped' },
        { id: 'what-is-left', text: 'What is left' },
      ],
    });
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.contents a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#what-shipped', '#what-is-left']);
    expect(links.map((a) => a.textContent?.trim())).toEqual(['What shipped', 'What is left']);
  });

  it('omits the on-this-page block when there are no headings', () => {
    const el = render({ groups: [{ label: 'Pillar', values: ['migrations'] }], sections: [] });
    expect(el.querySelector('.contents')).toBeNull();
  });

  it('is an aside with an accessible name, so it is skippable', () => {
    const el = render({ groups: [] });
    const aside = el.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute('aria-label')).toBe('Page details');
  });

  it('labels the on-this-page navigation', () => {
    const el = render({ sections: [{ id: 'a', text: 'A' }] });
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('On this page');
  });
});
