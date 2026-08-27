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

// Core & Consumers, light theme. Kept in step with src/styles/_tokens.scss by
// hand: this runs outside the Angular build and cannot read the emitted CSS.
const PAPER = '#eef2f6';
const PANEL = '#e3e9ef';
const WASH = '#f3ead8';
const INK = '#0d141b';
const ACCENT = '#855e1e';
const BRASS = '#855e1e';
const META = '#5a6874';
const RULE = '#cfd9e2';

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
    // Integer x, deliberately. opentype.js emits literal NaN into path data for
    // some glyphs placed at a fractional offset, which makes resvg abandon the
    // rest of the path: the card rendered "I take frontend" and then stopped.
    // The commands array is clean, so it happens during serialisation. Rounding
    // to a whole pixel at 1200px wide is invisible and removes the whole class
    // of bug. The fractional cursor is still what accumulates, so kerning and
    // tracking do not drift.
    data += glyph.getPath(Math.round(cursor), y, size).toPathData(2) + ' ';
    cursor += glyph.advanceWidth * scale + tracking;
    previous = glyph;
  }

  if (data.includes('NaN')) {
    throw new Error(`build-og-image: NaN in outlined path for "${text}"`);
  }

  return { data: data.trim(), width: cursor - x };
}

// Sequential, not Promise.all. wawoff2 is a WASM module and is not reentrant:
// two concurrent decompressions corrupt each other's output, and the corruption
// surfaces as an unrelated "Unsupported OpenType signature" much later.
// Archivo replaces Instrument Serif. One caveat worth writing down: opentype.js
// parses the fvar table but does not apply it, so glyph outlines come out at the
// font's default instance no matter what weight is requested. Verified by
// comparing path data at wght 400 and 900, which is byte-identical. The card
// therefore uses the default weight rather than the 700 the site's h1 uses.
// Browsers do apply the axis, so the page itself is unaffected.
const display = await loadFont('archivo-variable.woff2');
const sans = await loadFont('geist-variable.woff2');

// Sized so the longest line clears the graph column on the right. At 66 the
// second line ran to 814px and collided with the core node.
const DISPLAY = 56;
const LEADING = 68;
const FIRST_BASELINE = 250;
const GRAPH_COL_X = PAD + 700;

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
    const { data, width } = run(display, span.text, x, y, DISPLAY, -1.4);
    paths.push(`<path d="${data}" fill="${span.fill}"/>`);
    x += width;
  }
});

const eyebrow = run(sans, 'RAVI ANAND KUMAR', PAD, 140, 22, 3.4);
paths.push(`<path d="${eyebrow.data}" fill="${META}"/>`);

const footer = run(sans, 'Frontend Tech Lead, Berlin', PAD, 560, 24);
paths.push(`<path d="${footer.data}" fill="${META}"/>`);

// The signature, small, in the corner: a core and three consumers with the same
// orthogonal routing and junction pads the site uses. Drawn with rects and
// paths, so no font matching is involved.
const GX = GRAPH_COL_X;
const GY = 250;
const CORE = { x: GX, y: GY + 44, w: 108, h: 44 };
const CONS_X = GX + 190;
const CONS_W = 76;
const CONS_H = 32;
const ROWS = [GY, GY + 50, GY + 100];
const TRUNK = GX + 150;
const R = 8;

const graph = [`<rect x="${CORE.x}" y="${CORE.y}" width="${CORE.w}" height="${CORE.h}" rx="3" fill="${WASH}" stroke="${ACCENT}"/>`];
const coreMidY = CORE.y + CORE.h / 2;

for (const top of ROWS) {
  const midY = top + CONS_H / 2;
  const d =
    Math.abs(midY - coreMidY) < 0.5
      ? `M${CORE.x + CORE.w},${coreMidY} H${CONS_X}`
      : `M${CORE.x + CORE.w},${coreMidY} H${TRUNK - R} Q${TRUNK},${coreMidY} ${TRUNK},${coreMidY + (midY > coreMidY ? R : -R)} V${midY - (midY > coreMidY ? R : -R)} Q${TRUNK},${midY} ${TRUNK + R},${midY} H${CONS_X}`;
  graph.push(`<path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="1.5"/>`);
  if (Math.abs(midY - coreMidY) >= 0.5) {
    graph.push(`<circle cx="${TRUNK}" cy="${midY}" r="2.4" fill="${ACCENT}"/>`);
  }
  graph.push(`<rect x="${CONS_X}" y="${top}" width="${CONS_W}" height="${CONS_H}" rx="3" fill="${PANEL}" stroke="${RULE}"/>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${BRASS}"/>
  <line x1="${PAD}" y1="516" x2="${W - PAD}" y2="516" stroke="${RULE}" stroke-width="1"/>
  ${graph.join('\n  ')}
  ${paths.join('\n  ')}
</svg>`;

const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } });

await mkdir(join('src', 'assets'), { recursive: true });
const out = join('src', 'assets', 'og-default.png');
await writeFile(out, resvg.render().asPng());
console.log(`build-og-image: wrote ${out} (${W}x${H}), text outlined to paths`);
