import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReadDepthDirective } from './read-depth.directive';
import { Analytics } from './analytics';
import { ANALYTICS_HOST, PRODUCTION_HOST } from './analytics.config';

@Component({
  imports: [ReadDepthDirective],
  template: '<div [appReadDepth]="\'gerber-viewer\'"></div>',
})
class HostComponent {}

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

describe('ReadDepthDirective', () => {
  let callbacks: ObserverCallback[];
  let disconnects: number;
  const original = globalThis.IntersectionObserver;

  beforeEach(() => {
    callbacks = [];
    disconnects = 0;

    class StubObserver {
      constructor(callback: ObserverCallback) {
        callbacks.push(callback);
      }
      observe(): void {}
      disconnect(): void {
        disconnects += 1;
      }
      unobserve(): void {}
      takeRecords(): [] {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    globalThis.IntersectionObserver = StubObserver as unknown as typeof IntersectionObserver;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: ANALYTICS_HOST, useValue: PRODUCTION_HOST },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => {
    globalThis.IntersectionObserver = original;
  });

  /**
   * trackOnce is the seam, not track. The directive's contract is that it
   * reports on intersection and then stops observing; that the event itself is
   * capped at one per page view is the service's contract, covered in
   * analytics.spec.ts.
   */
  function spyOnTrackOnce(): unknown[][] {
    const sent: unknown[][] = [];
    TestBed.inject(Analytics).trackOnce = (name, params) => {
      sent.push([name, params]);
    };
    return sent;
  }

  it('reports read_complete when the sentinel comes into view, then stops observing', async () => {
    const sent = spyOnTrackOnce();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    callbacks[0]([{ isIntersecting: true }]);

    expect(sent).toEqual([['read_complete', { slug: 'gerber-viewer' }]]);
    expect(disconnects).toBeGreaterThan(0);
  });

  it('reports nothing while the sentinel is off screen', async () => {
    const sent = spyOnTrackOnce();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    callbacks[0]([{ isIntersecting: false }]);

    expect(sent).toEqual([]);
    expect(disconnects).toBe(0);
  });
});
