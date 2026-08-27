import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  function create(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick(); // let the constructor effect apply the initial preference
    return service;
  }

  it('defaults to system when nothing is stored', () => {
    expect(create().preference()).toBe('system');
  });

  it('writes no attribute for system, so the media query stays in charge', () => {
    create();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('stamps the attribute for an explicit choice', () => {
    const service = create();
    service.set('dark');
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    service.set('light');
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('removes the attribute again when returning to system', () => {
    const service = create();
    service.set('dark');
    TestBed.tick();
    service.set('system');
    TestBed.tick();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('persists the choice', () => {
    create().set('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('restores a stored choice on construction', () => {
    localStorage.setItem('theme', 'light');
    expect(create().preference()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('ignores a stored value that is not a preference', () => {
    localStorage.setItem('theme', 'sepia');
    expect(create().preference()).toBe('system');
  });

  it('cycles system to light to dark and back', () => {
    const service = create();
    expect(service.preference()).toBe('system');
    service.cycle();
    expect(service.preference()).toBe('light');
    service.cycle();
    expect(service.preference()).toBe('dark');
    service.cycle();
    expect(service.preference()).toBe('system');
  });
});
