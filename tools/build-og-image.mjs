// Generates src/assets/og-default.png, the Open Graph card, from the site's own
// palette and typefaces. Committed as an asset; rerun only when the wording or
// the palette changes.
//
// The text is converted to vector paths rather than left as SVG <text>. That is
// not a stylistic choice: Google Fonts strips the name table out of subsetted
// woff2 files, so the faces the site ships have no family name for a rasterizer
// to match, and resvg silently falls back to a Symbol font that renders Latin
// input as Greek. Outlining the glyphs removes font matching from the problem
// entirely, and guarantees the card uses the same faces as the page.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';
import opentype from 'opentype.js';

const W = 1200;
const H = 630;
const PAD = 84;

const PAPER = '#faf7f2';
const INK = '#17130e';
const ACCENT = '#7c2a20';
const BRASS = '#c9a15b';
const META = '#8a7b65';
const RULE = '#dcd5c9';

async function loadFont(name) {
  const decompressed = await decompress(await readFile(join('src', 'fonts', name)));
  // .slice() gives a Uint8Array backed by its own exactly-sized ArrayBuffer.
  // Handing opentype.js a pooled Buffer's underlying ArrayBuffer makes it read
  // from the wrong offset and reject the sfnt signature.
  const bytes = new Uint8Array(decompressed).slice();
  return opentype.parse(bytes.buffer);
}

// Lays out a string glyph by glyph so tracking can be applied, and returns both
// the path data and the advance, so callers can chain coloured runs on one line.
function run(font, text, x, y, size, tracking = 0) {
  const scale = size / font.unitsPerEm;
  let cursor = x;
  let data = '';
  let previous = null;

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    if (previous) cursor += font.getKerningValue(previous, glyph) * scale;
    data += glyph.getPath(cursor, y, size).toPathData(2) + ' ';
    cursor += glyph.advanceWidth * scale + tracking;
    previous = glyph;
  }

  return { data: data.trim(), width: cursor - x };
}

// Sequential, not Promise.all. wawoff2 is a WASM module and is not reentrant:
// two concurrent decompressions corrupt each other's output, and the corruption
// surfaces as an unrelated "Unsupported OpenType signature" much later.
const serif = await loadFont('instrument-serif-400.woff2');
const sans = await loadFont('geist-variable.woff2');

const SERIF = 72;
const LEADING = 84;
const FIRST_BASELINE = 268;

const lines = [
  [{ text: 'I take frontends that have', fill: INK }],
  [{ text: 'outgrown their structure and', fill: INK }],
  [
    { text: 'make them ', fill: INK },
    { text: 'workable again.', fill: ACCENT },
  ],
];

const paths = [];

lines.forEach((spans, i) => {
  let x = PAD;
  const y = FIRST_BASELINE + i * LEADING;
  for (const span of spans) {
    const { data, width } = run(serif, span.text, x, y, SERIF);
    paths.push(`<path d="${data}" fill="${span.fill}"/>`);
    x += width;
  }
});

const eyebrow = run(sans, 'RAVI ANAND KUMAR', PAD, 140, 22, 3.4);
paths.push(`<path d="${eyebrow.data}" fill="${META}"/>`);

const footer = run(sans, 'Frontend Tech Lead, Berlin', PAD, 560, 24);
paths.push(`<path d="${footer.data}" fill="${META}"/>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${BRASS}"/>
  <line x1="${PAD}" y1="516" x2="${W - PAD}" y2="516" stroke="${RULE}" stroke-width="1"/>
  ${paths.join('\n  ')}
</svg>`;

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });

await mkdir(join('src', 'assets'), { recursive: true });
const out = join('src', 'assets', 'og-default.png');
await writeFile(out, resvg.render().asPng());
console.log(`build-og-image: wrote ${out} (${W}x${H}), text outlined to paths`);
