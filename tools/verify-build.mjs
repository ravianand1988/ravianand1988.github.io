import { readFile, access, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const BROWSER_DIR = join('dist', 'ravianand1988.github.io', 'browser');
const SITE_URL = 'https://ravianand1988.github.io';
const failures = [];

const { writingSlugs, projectSlugs } = JSON.parse(
  await readFile(join('src', 'generated', 'slugs.json'), 'utf8'),
);

async function html(...segments) {
  return readFile(join(BROWSER_DIR, ...segments), 'utf8');
}

function titleOf(markup) {
  return markup.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
}

// --- 1. Every static route must exist as its own file.
for (const route of ['', 'writing', 'projects', 'ai', 'about']) {
  const path = route ? [route, 'index.html'] : ['index.html'];
  try {
    await access(join(BROWSER_DIR, ...path));
  } catch {
    failures.push(`missing prerendered route: /${route}`);
  }
}

// --- 2. The 404 fallback must be the CSR shell, not the prerendered homepage.
try {
  const [notFound, home] = await Promise.all([html('404.html'), html('index.html')]);
  if (notFound === home) failures.push('404.html is a copy of the prerendered index.html');
  if (!notFound.includes('<app-root')) failures.push('404.html does not contain the app root');
} catch {
  failures.push('404.html is missing');
}

// --- 3. Each entry gets its own file, with its own title and absolute og:url.
const homeTitle = titleOf(await html('index.html'));
const entries = [
  ...writingSlugs.map((slug) => ['writing', slug]),
  ...projectSlugs.map((slug) => ['projects', slug]),
];

for (const [collection, slug] of entries) {
  let markup;
  try {
    markup = await html(collection, slug, 'index.html');
  } catch {
    failures.push(`missing prerendered page: /${collection}/${slug}`);
    continue;
  }

  const title = titleOf(markup);
  if (!title || title === homeTitle) {
    failures.push(`/${collection}/${slug} does not carry its own <title> (got "${title}")`);
  }
  if (!markup.includes(`content="${SITE_URL}/${collection}/${slug}"`)) {
    failures.push(`/${collection}/${slug} is missing an absolute og:url`);
  }
  if (!markup.includes('property="og:image"')) {
    failures.push(`/${collection}/${slug} is missing og:image`);
  }
}

// --- 4. The feeds must be at the site root, not under /assets.
for (const file of ['rss.xml', 'sitemap.xml']) {
  try {
    await access(join(BROWSER_DIR, file));
  } catch {
    failures.push(`missing ${file} at the site root`);
  }
}

// --- 5. Every local asset the shipped markup references must actually exist.
// A link to a missing PDF or a missing og:image is invisible in a build log and
// obvious to the first person who clicks it.
const referenced = new Set();
for (const file of ['index.html', 'about/index.html', 'ai/index.html']) {
  let markup;
  try {
    markup = await html(...file.split('/'));
  } catch {
    continue;
  }
  // Both absolute (/assets/x) and root-relative (assets/x) forms. Angular
  // templates commonly use the relative form, and an earlier version of this
  // check only matched the absolute one, which let three missing SVGs through.
  for (const match of markup.matchAll(
    /(?:href|src|srcset|content)="(?:https:\/\/ravianand1988\.github\.io)?\/?(assets\/[^"]+)"/g,
  )) {
    referenced.add('/' + match[1]);
  }
}
for (const asset of referenced) {
  try {
    await access(join(BROWSER_DIR, asset.replace(/^\//, '')));
  } catch {
    failures.push(`markup references ${asset} but the file is not in the build`);
  }
}

// --- 6. No em-dashes in authored copy. Plain punctuation is a stated rule.
async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walk(path)));
    } else if (entry.name === 'generated') {
      continue;
    } else if (['.md', '.html', '.ts'].includes(extname(entry.name))) {
      found.push(path);
    }
  }
  return found;
}
// Scan all of src/, not just src/app/: index.html is authored copy too, and an
// em-dash hid there through several passes of this check.
for (const dir of ['content', 'src']) {
  let files = [];
  try {
    files = await walk(dir);
  } catch {
    continue;
  }
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    if (text.includes('—')) failures.push(`em-dash in authored copy: ${file}`);
  }
}

// --- Structured data must parse, and say who this is.
//
// A broken JSON-LD block is invisible: the page renders identically and search
// engines just drop it. So parse it rather than checking the string is present,
// and confirm the sameAs profiles match the ones the footer links to, since
// those are the same claim made twice.
const SAME_AS = [
  'https://www.linkedin.com/in/ravianandkumar/',
  'https://github.com/ravianand1988',
  'https://stackoverflow.com/users/2444505/ravi-anand',
];

{
  const markup = await html('index.html');
  const block = markup.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];

  if (!block) {
    failures.push('index.html has no application/ld+json block');
  } else {
    let data;
    try {
      data = JSON.parse(block);
    } catch (error) {
      failures.push(`application/ld+json does not parse: ${error.message}`);
    }
    if (data) {
      if (data['@type'] !== 'Person') failures.push('structured data is not a Person');
      if (!data.name) failures.push('structured data has no name');
      if (!String(data.url ?? '').startsWith(SITE_URL)) {
        failures.push('structured data url is not absolute on this site');
      }
      for (const profile of SAME_AS) {
        if (!(data.sameAs ?? []).includes(profile)) {
          failures.push(`structured data sameAs is missing ${profile}`);
        }
      }
      // Check the footer actually links each profile, by href rather than by
      // substring: the JSON-LD block contains these same URLs, so a plain
      // "does the page mention it" test could never fail.
      for (const profile of SAME_AS) {
        if (!markup.includes(`href="${profile}"`)) {
          failures.push(`sameAs claims ${profile} but no link on the page points there`);
        }
      }
    }
  }
}

// --- Heading order on every prerendered page.
//
// One h1, and no level skipped on the way down. A jump from h1 to h3 tells a
// screen-reader user a level exists that does not, and it is the kind of thing
// that only breaks once somebody edits markdown in a hurry.
const pagePaths = [
  ['index.html'],
  ['writing', 'index.html'],
  ['projects', 'index.html'],
  ['ai', 'index.html'],
  ['about', 'index.html'],
  ...writingSlugs.map((slug) => ['writing', slug, 'index.html']),
  ...projectSlugs.map((slug) => ['projects', slug, 'index.html']),
];

let headingsChecked = 0;

for (const segments of pagePaths) {
  let markup;
  try {
    markup = await html(...segments);
  } catch {
    continue; // a missing route is already reported above
  }
  const route = `/${segments.slice(0, -1).join('/')}`;

  // Strip the inline JSON-LD before scanning: it is script content, not markup,
  // but it can contain angle brackets that confuse a tag-level regex.
  const body = markup.replace(/<script[\s\S]*?<\/script>/g, '');
  const levels = [...body.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));

  const h1s = levels.filter((level) => level === 1).length;
  if (h1s !== 1) failures.push(`${route} has ${h1s} h1 elements, expected exactly 1`);

  for (let i = 1; i < levels.length; i += 1) {
    const jump = levels[i] - levels[i - 1];
    if (jump > 1) {
      failures.push(`${route} skips a heading level: h${levels[i - 1]} straight to h${levels[i]}`);
      break;
    }
  }
  headingsChecked += levels.length;
}

if (failures.length) {
  console.error('verify-build FAILED:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `verify-build: 5 static routes, ${writingSlugs.length} posts, ${projectSlugs.length} projects, 404 fallback, feeds at root, ${referenced.size} referenced assets present, no em-dashes, ${headingsChecked} headings in order, Person structured data`,
);
