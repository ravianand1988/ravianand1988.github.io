import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');

const files = await readdir(BROWSER_DIR);
const cssName = files.find((f) => f.startsWith('styles-') && f.endsWith('.css'));
if (!cssName) throw new Error('no emitted styles-*.css found');
const css = await readFile(join(BROWSER_DIR, cssName), 'utf8');

const required = ['--paper', '--ink', '--accent', '--font-display', '--font-mono', '--measure-prose'];
const missing = required.filter((token) => !css.includes(token));
if (missing.length) throw new Error(`tokens missing from emitted CSS: ${missing.join(', ')}`);

if (!css.includes('prefers-color-scheme:dark') && !css.includes('prefers-color-scheme: dark')) {
  throw new Error('no dark theme block in emitted CSS');
}

if (css.includes('fonts.gstatic.com') || css.includes('fonts.googleapis.com')) {
  throw new Error('emitted CSS requests a third-party font host');
}

const fonts = await readdir(join(BROWSER_DIR, 'assets', 'fonts'));
const woff2 = fonts.filter((f) => f.endsWith('.woff2'));
if (woff2.length < 4) throw new Error(`expected 4 self-hosted woff2 files, found ${woff2.length}`);

console.log(`verify-styles: ${required.length} tokens present, dark theme present, ${woff2.length} self-hosted fonts, no third-party font hosts`);
