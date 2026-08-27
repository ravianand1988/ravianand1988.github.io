export const PILLARS = Object.freeze([
  'ai-engineering',
  'frontend-architecture',
  'migrations',
  'leading-teams',
]);

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isPublished(entry) {
  return entry.draft !== true;
}

export function byDateDesc(a, b) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Frontmatter dates arrive as either a Date or a string: gray-matter's YAML
// parser converts an unquoted `date: 2026-08-26` into a Date. Format via UTC
// getters so a local timezone offset can never shift the day.
export function normalizeDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? '').trim();
}

export function assertEntry(entry, sourcePath) {
  for (const field of ['title', 'description', 'date', 'pillar']) {
    if (!entry[field]) {
      throw new Error(`${sourcePath}: frontmatter is missing required field "${field}"`);
    }
  }
  if (!ISO_DATE.test(entry.date)) {
    throw new Error(`${sourcePath}: date "${entry.date}" is not ISO format (YYYY-MM-DD)`);
  }
  if (!PILLARS.includes(entry.pillar)) {
    throw new Error(`${sourcePath}: pillar "${entry.pillar}" is not one of ${PILLARS.join(', ')}`);
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toRfc822(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = DAYS[d.getUTCDay()];
  const date = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()];
  return `${day}, ${date} ${month} ${d.getUTCFullYear()} 00:00:00 GMT`;
}

export function buildRssXml({ siteUrl, title, description, items }) {
  const entries = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${siteUrl}${item.path}</link>
      <guid isPermaLink="true">${siteUrl}${item.path}</guid>
      <pubDate>${toRfc822(item.date)}</pubDate>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${siteUrl}/</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>
`;
}

export function buildSitemapXml({ siteUrl, paths }) {
  const urls = paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * Stamps ids onto h2 and h3 elements and returns the headings it found.
 *
 * Done by rewriting marked's output rather than through a custom heading
 * renderer, so it does not move when marked changes its renderer signature.
 * That is safe only because the input is first-party markdown compiled at build
 * time: headings here are a single line of simple inline content.
 *
 * Duplicate headings get a numeric suffix, because two sections called "What
 * shipped" in one document would otherwise share an anchor and the second one
 * would be unreachable.
 */
export function addHeadingIds(html) {
  const headings = [];
  const seen = new Map();

  const out = String(html).replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (match, level, inner) => {
    const text = inner
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();

    const base = slugify(text);
    if (!base) return match;

    const previous = seen.get(base) ?? 0;
    seen.set(base, previous + 1);
    const id = previous === 0 ? base : `${base}-${previous + 1}`;

    headings.push({ id, text, level: Number(level) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });

  return { html: out, headings };
}

/**
 * Turns a bold-lead paragraph into a card.
 *
 * The case studies already use one convention for a named decision: a
 * paragraph opening with bold text that ends in a full stop, then the reasoning
 * after it. This lifts those out as cards so a reader skimming for judgement
 * can find them, using the prose that is already there rather than a second
 * copy in frontmatter.
 *
 * Deliberately adds no label of its own. The title is the author's own bold
 * text, minus the trailing full stop, so the markup cannot claim a paragraph is
 * a "decision" when it is something else written the same way.
 */
export function markDecisions(html) {
  let count = 0;
  const out = String(html).replace(
    /<p><strong>([^<]+?)\.<\/strong>\s*([\s\S]*?)<\/p>/g,
    (match, title, body) => {
      if (!title.trim() || !body.trim()) return match;
      count += 1;
      return [
        '<aside class="decision">',
        `<p class="decision-title">${title.trim()}</p>`,
        `<p class="decision-body">${body.trim()}</p>`,
        '</aside>',
      ].join('');
    },
  );
  return { html: out, count };
}

/**
 * Optional frontmatter for case studies: the stack it was built on, and the
 * figures worth surfacing. Both are validated here so a typo fails the build
 * rather than rendering an empty rail group or a metric with no number.
 */
export function assertOptionalMeta(entry, sourcePath) {
  if (entry.stack !== undefined) {
    if (!Array.isArray(entry.stack) || entry.stack.some((s) => typeof s !== 'string' || !s.trim())) {
      throw new Error(`${sourcePath}: "stack" must be a list of non-empty strings`);
    }
  }
  if (entry.metrics !== undefined) {
    if (!Array.isArray(entry.metrics)) {
      throw new Error(`${sourcePath}: "metrics" must be a list`);
    }
    for (const metric of entry.metrics) {
      const ok =
        metric &&
        typeof metric === 'object' &&
        typeof metric.label === 'string' &&
        metric.label.trim() &&
        metric.value !== undefined &&
        String(metric.value).trim();
      if (!ok) {
        throw new Error(
          `${sourcePath}: every metric needs a non-empty "label" and "value", got ${JSON.stringify(metric)}`,
        );
      }
    }
  }
}
