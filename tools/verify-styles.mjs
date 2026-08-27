import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');

const files = await readdir(BROWSER_DIR);
const cssName = files.find((f) => f.startsWith('styles-') && f.endsWith('.css'));
if (!cssName) throw new Error('no emitted styles-*.css found');
const css = await readFile(join(BROWSER_DIR, cssName), 'utf8');

const required = ['--bg', '--surface', '--panel', '--ink', '--accent', '--border', '--font-display', '--font-mono', '--measure-prose'];
const missing = required.filter((token) => !css.includes(token));
if (missing.length) throw new Error(`tokens missing from emitted CSS: ${missing.join(', ')}`);

if (!css.includes('prefers-color-scheme:dark') && !css.includes('prefers-color-scheme: dark')) {
  throw new Error('no dark theme block in emitted CSS');
}

if (css.includes('fonts.gstatic.com') || css.includes('fonts.googleapis.com')) {
  throw new Error('emitted CSS requests a third-party font host');
}

// Three faces since the Core & Consumers re-skin: Archivo display, Geist body,
// Geist Mono for data. The two Instrument Serif files went with the serif.
const EXPECTED_FONTS = ['archivo-variable.woff2', 'geist-variable.woff2', 'geist-mono-variable.woff2'];
const fonts = await readdir(join(BROWSER_DIR, 'assets', 'fonts'));
const woff2 = fonts.filter((f) => f.endsWith('.woff2'));
const missingFonts = EXPECTED_FONTS.filter((f) => !woff2.includes(f));
if (missingFonts.length) throw new Error(`self-hosted fonts missing: ${missingFonts.join(', ')}`);
if (woff2.length !== EXPECTED_FONTS.length) {
  throw new Error(`expected ${EXPECTED_FONTS.length} self-hosted woff2 files, found ${woff2.length}: ${woff2.join(', ')}`);
}

console.log(`verify-styles: ${required.length} tokens present, dark theme present, ${woff2.length} self-hosted fonts (${woff2.sort().join(', ')}), no third-party font hosts`);
