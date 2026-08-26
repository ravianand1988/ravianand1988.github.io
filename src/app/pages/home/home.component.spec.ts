import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('leads with the through-line', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('outgrown their structure');
  });

  it('shows at most three selected work items', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.work .row');
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('states availability as a sentence, not a pill, and omits visa detail', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.availability')?.tagName).toBe('P');
    expect(el.textContent).not.toContain('sponsorship');
    expect(el.querySelector('.tag')).toBeNull();
  });
});
