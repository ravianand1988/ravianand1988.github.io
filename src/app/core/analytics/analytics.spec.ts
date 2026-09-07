import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Analytics } from './analytics';
import {
  ANALYTICS_HOST,
  CONSENT_KEY,
  MEASUREMENT_ID,
  PRODUCTION_HOST,
  isEnabled,
} from './analytics.config';

describe('isEnabled', () => {
  it('is false on the server, where there is no browser to measure', () => {
    expect(isEnabled(false, PRODUCTION_HOST)).toBe(false);
  });

  it('is false on localhost, so dev traffic never reaches the property', () => {
    expect(isEnabled(true, 'localhost')).toBe(false);
  });

  it('is false on any other host, including a preview deployment', () => {
    expect(isEnabled(true, 'ravianand1988.github.io.evil.test')).toBe(false);
  });

  it('is true only on the deployed site', () => {
    expect(isEnabled(true, PRODUCTION_HOST)).toBe(true);
  });
});

interface TestWindow extends Window {
  dataLayer?: IArguments[];
  gtag?: (...args: unknown[]) => void;
}

function layer(): unknown[][] {
  const entries = (window as TestWindow).dataLayer ?? [];
  return entries.map((entry) => Array.from(entry));
}

function commands(name: string): unknown[][] {
  return layer().filter((entry) => entry[0] === name);
}

function tagScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll('script')].filter((s) =>
    s.src.includes('googletagmanager.com'),
  );
}

describe('Analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as TestWindow).dataLayer;
    delete (window as TestWindow).gtag;
    for (const script of tagScripts()) script.remove();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    for (const script of tagScripts()) script.remove();
  });

  /** Enabled by default, because that is the interesting path. */
  function create(host = PRODUCTION_HOST, platform = 'browser'): Analytics {
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: host },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    const service = TestBed.inject(Analytics);
    service.init();
    return service;
  }

  it('denies all four signals by default', () => {
    create();
    expect(commands('consent')[0]).toEqual([
      'consent',
      'default',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
  });

  it('appends the tag and turns GA automatic page views off', () => {
    create();
    expect(tagScripts()).toHaveLength(1);
    expect(tagScripts()[0].src).toContain(MEASUREMENT_ID);
    expect(commands('config')[0]).toEqual(['config', MEASUREMENT_ID, { send_page_view: false }]);
  });

  it('injects nothing and writes nothing when the host is not production', () => {
    create('localhost');
    expect(tagScripts()).toHaveLength(0);
    expect((window as TestWindow).dataLayer).toBeUndefined();
  });

  it('injects nothing on the server', () => {
    create(PRODUCTION_HOST, 'server');
    expect(tagScripts()).toHaveLength(0);
  });

  it('applies a stored grant before the tag is appended, not after', () => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    create();

    const consent = commands('consent');
    expect(consent[1]).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    // The update must precede the config command, which is pushed after the
    // script element is created. Otherwise a returning visitor is briefly denied.
    const updateIndex = layer().findIndex((entry) => entry[1] === 'update');
    const configIndex = layer().findIndex((entry) => entry[0] === 'config');
    expect(updateIndex).toBeLessThan(configIndex);
  });

  it('grants only analytics storage on accept, never the ad signals', () => {
    const service = create();
    service.accept();

    expect(commands('consent').at(-1)).toEqual([
      'consent',
      'update',
      { analytics_storage: 'granted' },
    ]);
    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(service.choice()).toBe('granted');
  });

  it('stores the refusal and pushes no update on decline', () => {
    const service = create();
    const before = commands('consent').length;
    service.decline();

    expect(commands('consent')).toHaveLength(before);
    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(service.choice()).toBe('denied');
  });

  it('sends no events when disabled', () => {
    const service = create('localhost');
    service.track('read_complete', { slug: 'x' });
    expect((window as TestWindow).dataLayer).toBeUndefined();
  });

  it('sends an event with its parameters when enabled', () => {
    const service = create();
    service.track('read_complete', { slug: 'gerber-viewer' });
    expect(commands('event').at(-1)).toEqual([
      'event',
      'read_complete',
      { slug: 'gerber-viewer' },
    ]);
  });

  it('sends a once-per-page-view event only once', () => {
    const service = create();
    service.trackOnce('gerber_interaction');
    service.trackOnce('gerber_interaction');

    expect(commands('event').filter((entry) => entry[1] === 'gerber_interaction')).toHaveLength(1);
  });

  it('reopen shows the banner again after a choice was made', () => {
    const service = create();
    service.accept();
    expect(service.bannerVisible()).toBe(false);
    service.reopen();
    expect(service.bannerVisible()).toBe(true);
  });
});
