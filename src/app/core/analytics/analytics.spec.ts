import { isEnabled, PRODUCTION_HOST } from './analytics.config';

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
