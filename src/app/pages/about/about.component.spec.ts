import { TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
    }).compileComponents();
  });

  // The cap exists to stop the old thirteen-bullet dump coming back, not to
  // enforce exactly four. Five is the ceiling now that the test-suite bullet
  // earned a place.
  it('keeps byrd to a short bullet list', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const bullets = (fixture.nativeElement as HTMLElement).querySelectorAll('.role-byrd li');
    expect(bullets.length).toBeLessThanOrEqual(5);
  });

  it('has no skills tag cloud', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Jira');
    expect(el.querySelector('.tag')).toBeNull();
  });

  it('links the CV', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const cv = (fixture.nativeElement as HTMLElement).querySelector('a[download]');
    expect(cv?.getAttribute('href')).toContain('Ravi_Anand_Kumar_CV');
  });

  // The rail's ids are hand-written in the template rather than stamped by the
  // content pipeline, so a heading rename would silently break every anchor.
  it('points every rail link at a heading that exists on the page', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const headingIds = Array.from(el.querySelectorAll('h2[id]')).map((h) => h.id);
    const railIds = fixture.componentInstance.railSections.map((s) => s.id);

    expect(railIds.length).toBeGreaterThan(0);
    for (const id of railIds) {
      expect(headingIds).toContain(id);
    }
  });

  it('lists every h2 in the rail, so nothing is unreachable from it', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const headingIds = Array.from(el.querySelectorAll('h2')).map((h) => h.id);
    expect(headingIds.every((id) => !!id)).toBe(true);
    expect(headingIds.sort()).toEqual(
      fixture.componentInstance.railSections.map((s) => s.id).sort(),
    );
  });
});