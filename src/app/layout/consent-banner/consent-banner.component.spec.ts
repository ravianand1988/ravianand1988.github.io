import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConsentBannerComponent } from './consent-banner.component';
import { Analytics } from '../../core/analytics/analytics';
import { ANALYTICS_HOST, CONSENT_KEY } from '../../core/analytics/analytics.config';

describe('ConsentBannerComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: 'localhost' },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(ConsentBannerComponent);
    const analytics = TestBed.inject(Analytics);
    fixture.detectChanges();
    return { fixture, analytics };
  }

  function buttons(fixture: { nativeElement: HTMLElement }): HTMLButtonElement[] {
    return [...fixture.nativeElement.querySelectorAll('button')];
  }

  it('is hidden until something asks for it', () => {
    const { fixture } = render();
    expect(buttons(fixture)).toHaveLength(0);
  });

  it('shows both choices once visible', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    const labels = buttons(fixture).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Decline', 'Accept']);
  });

  it('names Google and links to its privacy policy', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Google');
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.href).toBe('https://policies.google.com/privacy');
  });

  it('stores the choice and dismisses itself on accept', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    buttons(fixture)[1].click();
    fixture.detectChanges();

    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(buttons(fixture)).toHaveLength(0);
  });

  it('stores the refusal and dismisses itself on decline', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();

    buttons(fixture)[0].click();
    fixture.detectChanges();

    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(buttons(fixture)).toHaveLength(0);
  });

  it('carries no em-dash, which the build forbids', () => {
    const { fixture, analytics } = render();
    analytics.reopen();
    fixture.detectChanges();
    // Built from its code point, not typed: verify-build scans authored source
    // for the character, so a literal one here would fail the build it guards.
    const emDash = String.fromCharCode(0x2014);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(emDash);
  });
});
