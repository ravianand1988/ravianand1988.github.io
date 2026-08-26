import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SiteHeaderComponent } from './site-header.component';
import { routes } from '../../app.routes';

describe('SiteHeaderComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('lists exactly the four output destinations', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.links a'),
    ).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Writing', 'Projects', 'Building with AI', 'About']);
  });

  it('does not link to a skills or contact page', () => {
    const fixture = TestBed.createComponent(SiteHeaderComponent);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).not.toContain('Skills');
    expect(html).not.toContain('Contact');
  });
});
