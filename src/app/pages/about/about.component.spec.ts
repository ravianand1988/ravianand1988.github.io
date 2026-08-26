import { TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
    }).compileComponents();
  });

  it('keeps byrd to at most four bullets', () => {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    const bullets = (fixture.nativeElement as HTMLElement).querySelectorAll('.role-byrd li');
    expect(bullets.length).toBeLessThanOrEqual(4);
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
