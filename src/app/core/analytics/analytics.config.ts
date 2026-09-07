import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/**
 * The GA4 property this site reports to. Measurement IDs ship in the page source
 * of every site that uses GA4, so this is public by design and a build-time
 * secret would buy nothing.
 */
export const MEASUREMENT_ID = 'G-D3ZCLSGYT8';

/** Analytics runs on the deployed site and nowhere else. */
export const PRODUCTION_HOST = 'ravianand1988.github.io';

export const CONSENT_KEY = 'analytics-consent';

export const EVENT = {
  cvDownload: 'cv_download',
  readComplete: 'read_complete',
  gerberInteraction: 'gerber_interaction',
} as const;

/**
 * Whether the tag may load and events may be sent.
 *
 * Pure, and exported on its own, because jsdom makes location awkward to
 * override: the decision is worth testing directly rather than through the
 * service's environment. Note this gates the tag only. Consent state and the
 * banner stay live everywhere, so the banner can be developed on localhost.
 */
export function isEnabled(isBrowser: boolean, hostname: string): boolean {
  return isBrowser && hostname === PRODUCTION_HOST;
}

/**
 * The hostname the switch reads. A token rather than a direct location read so a
 * test can provide the production host without fighting jsdom.
 */
export const ANALYTICS_HOST = new InjectionToken<string>('analytics host', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView?.location.hostname ?? '',
});
