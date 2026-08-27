import { TestBed } from '@angular/core/testing';
import { AiComponent } from './ai.component';

describe('AiComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AiComponent] }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(AiComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  // Same hazard as the about page: these ids are written by hand, so only a
  // test catches a heading rename.
  it('points every rail link at a heading that exists, and covers them all', () => {
    const { fixture, el } = render();
    const headingIds = Array.from(el.querySelectorAll('h2')).map((h) => h.id);
    const railIds = fixture.componentInstance.railSections.map((s) => s.id);

    expect(headingIds.every((id) => !!id)).toBe(true);
    expect(headingIds.sort()).toEqual([...railIds].sort());
  });

  it('counts the skills the page actually lists', () => {
    const { fixture, el } = render();
    const listed = el.querySelectorAll('.prose ul li').length;
    const claimed = fixture.componentInstance.railGroups.find((g) => g.label === 'Skills');
    expect(claimed?.values[0]).toBe(String(listed));
  });

  it('links the public repository', () => {
    const { el } = render();
    const link = el.querySelector<HTMLAnchorElement>('a[href*="github.com"]');
    expect(link?.getAttribute('href')).toContain('claude-code-engineering-skills');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });
});
