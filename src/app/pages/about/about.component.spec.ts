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
});
