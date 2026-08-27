// Fails the build when a text token drops below WCAG AA against a surface it is
// actually used on, in either theme.
//
// This exists because the palette was got wrong once already: the first draft
// used --ink-subtle #6d7c89 and --brass #8a6220, which measure 3.81 and 4.46 on
// --panel. Both were caught by measuring in a browser, which only works if
// somebody remembers to do it. Now the build remembers.
//
// It reads the emitted CSS rather than the SCSS source, so it checks what
// actually shipped, including any value a later rule overrode.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');

// Every pair below is a real combination on the site. Small mono labels sit on
// all three surfaces, which is why the thresholds are the normal-text 4.5 and
// not the large-text 3.0.
const TEXT_TOKENS = ['--ink', '--ink-muted', '--ink-subtle', '--meta', '--accent'];
const SURFACE_TOKENS = ['--bg', '--surface', '--panel'];
const MIN_RATIO = 4.5;

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const channels = [0, 2, 4].map((i) => {
    const srgb = parseInt(full.slice(i, i + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Pulls token declarations out of one CSS block. Only literal hex values are
 * collected: --brass is declared as var(--accent), and resolving indirection
 * here would mean reimplementing the cascade, so aliases are skipped and the
 * token they point at is checked instead.
 */
function readTokens(block) {
  const tokens = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?:;|})/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

function findBlock(css, selector) {
  const at = css.indexOf(selector);
  if (at === -1) return null;
  const open = css.indexOf('{', at);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open, i + 1);
    }
  }
  return null;
}

const files = await readdir(BROWSER_DIR);
const cssName = files.find((f) => f.startsWith('styles-') && f.endsWith('.css'));
if (!cssName) throw new Error('verify-contrast: no emitted styles-*.css found');
const css = await readFile(join(BROWSER_DIR, cssName), 'utf8');

// Light lives on the bare :root. Dark is declared twice, under the media query
// and under [data-theme="dark"]; the second is the one with a stable selector
// to search for, and both carry the same values by construction.
const lightBlock = findBlock(css, ':root{') ?? findBlock(css, ':root {');
const darkBlock = findBlock(css, ':root[data-theme=dark]') ?? findBlock(css, ':root[data-theme="dark"]');

if (!lightBlock) throw new Error('verify-contrast: could not find the :root token block');
if (!darkBlock) throw new Error('verify-contrast: could not find the [data-theme=dark] token block');

const themes = {
  light: readTokens(lightBlock),
  dark: readTokens(darkBlock),
};

const failures = [];
const checked = [];

for (const [theme, tokens] of Object.entries(themes)) {
  for (const surface of SURFACE_TOKENS) {
    if (!tokens[surface]) {
      failures.push(`${theme}: surface token ${surface} is missing or not a hex literal`);
      continue;
    }
    for (const text of TEXT_TOKENS) {
      if (!tokens[text]) {
        failures.push(`${theme}: text token ${text} is missing or not a hex literal`);
        continue;
      }
      const ratio = contrast(tokens[text], tokens[surface]);
      checked.push({ theme, text, surface, ratio });
      if (ratio < MIN_RATIO) {
        failures.push(
          `${theme}: ${text} ${tokens[text]} on ${surface} ${tokens[surface]} is ${ratio.toFixed(2)}:1, below ${MIN_RATIO}:1`,
        );
      }
    }
  }
}

if (failures.length) {
  throw new Error(`verify-contrast failed:\n  ${failures.join('\n  ')}`);
}

const worst = checked.reduce((a, b) => (a.ratio < b.ratio ? a : b));
console.log(
  `verify-contrast: ${checked.length} token pairs clear ${MIN_RATIO}:1 in both themes ` +
    `(worst ${worst.text} on ${worst.surface} in ${worst.theme}, ${worst.ratio.toFixed(2)}:1)`,
);
