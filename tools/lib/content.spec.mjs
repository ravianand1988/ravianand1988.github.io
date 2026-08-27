import { describe, it, expect } from 'vitest';
import {
  slugify,
  isPublished,
  byDateDesc,
  assertEntry,
  normalizeDate,
  buildRssXml,
  buildSitemapXml,
  addHeadingIds,
  markDecisions,
  assertOptionalMeta,
} from './content.mjs';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('What a Team Actually Does')).toBe('what-a-team-actually-does');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('GST, invoicing & stock: a story')).toBe('gst-invoicing-stock-a-story');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello--  ')).toBe('hello');
  });
});

describe('isPublished', () => {
  it('treats a missing draft flag as published', () => {
    expect(isPublished({})).toBe(true);
  });

  it('excludes drafts', () => {
    expect(isPublished({ draft: true })).toBe(false);
  });
});

describe('byDateDesc', () => {
  it('sorts newest first', () => {
    const entries = [{ date: '2026-01-01' }, { date: '2026-08-26' }, { date: '2026-05-04' }];
    expect(entries.sort(byDateDesc).map((e) => e.date)).toEqual([
      '2026-08-26',
      '2026-05-04',
      '2026-01-01',
    ]);
  });
});

describe('normalizeDate', () => {
  // gray-matter's YAML parser turns an unquoted `date: 2026-08-26` into a JS
  // Date, so frontmatter reaches us as either a Date or a string.
  it('formats a Date as an ISO day in UTC', () => {
    expect(normalizeDate(new Date('2026-08-26T00:00:00Z'))).toBe('2026-08-26');
  });

  it('does not shift the day for a Date created in a positive-offset zone', () => {
    expect(normalizeDate(new Date(Date.UTC(2026, 7, 26, 0, 0, 0)))).toBe('2026-08-26');
  });

  it('passes an already-ISO string through untouched', () => {
    expect(normalizeDate('2026-08-26')).toBe('2026-08-26');
  });

  it('trims a quoted string', () => {
    expect(normalizeDate('  2026-08-26  ')).toBe('2026-08-26');
  });

  it('returns an empty string for a missing value, so assertEntry reports it', () => {
    expect(normalizeDate(undefined)).toBe('');
  });
});

describe('assertEntry', () => {
  const valid = {
    title: 'A post',
    description: 'What it is about.',
    date: '2026-08-26',
    pillar: 'migrations',
  };

  it('accepts a complete entry', () => {
    expect(() => assertEntry(valid, 'content/writing/a.md')).not.toThrow();
  });

  it('names the file and the field when one is missing', () => {
    const { description, ...rest } = valid;
    expect(() => assertEntry(rest, 'content/writing/a.md')).toThrow(
      /content\/writing\/a\.md.*description/,
    );
  });

  it('rejects an unknown pillar', () => {
    expect(() => assertEntry({ ...valid, pillar: 'vibes' }, 'x.md')).toThrow(/pillar.*vibes/);
  });

  it('rejects a non-ISO date', () => {
    expect(() => assertEntry({ ...valid, date: '26/08/2026' }, 'x.md')).toThrow(/date/);
  });
});

describe('buildRssXml', () => {
  const xml = buildRssXml({
    siteUrl: 'https://ravianand1988.github.io',
    title: 'Ravi Anand Kumar',
    description: 'Writing about frontend architecture.',
    items: [
      {
        title: 'Rules & regulations',
        description: 'On GST <rules>.',
        path: '/writing/rules',
        date: '2026-08-26',
      },
    ],
  });

  it('is a well-formed rss document', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });

  it('escapes markup in titles and descriptions', () => {
    expect(xml).toContain('Rules &amp; regulations');
    expect(xml).toContain('On GST &lt;rules&gt;.');
  });

  it('emits absolute links and rfc-822 dates', () => {
    expect(xml).toContain('<link>https://ravianand1988.github.io/writing/rules</link>');
    expect(xml).toContain('<pubDate>Wed, 26 Aug 2026 00:00:00 GMT</pubDate>');
  });
});

describe('buildSitemapXml', () => {
  it('lists every path as an absolute url', () => {
    const xml = buildSitemapXml({
      siteUrl: 'https://ravianand1988.github.io',
      paths: ['/', '/writing', '/writing/rules'],
    });
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain('<loc>https://ravianand1988.github.io/</loc>');
    expect(xml).toContain('<loc>https://ravianand1988.github.io/writing/rules</loc>');
  });
});

describe('addHeadingIds', () => {
  it('stamps ids on h2 and h3 and reports them in document order', () => {
    const { html, headings } = addHeadingIds('<h2>What shipped</h2><p>a</p><h3>One box</h3>');
    expect(html).toContain('<h2 id="what-shipped">What shipped</h2>');
    expect(html).toContain('<h3 id="one-box">One box</h3>');
    expect(headings).toEqual([
      { id: 'what-shipped', text: 'What shipped', level: 2 },
      { id: 'one-box', text: 'One box', level: 3 },
    ]);
  });

  it('suffixes a repeated heading so the second one is still reachable', () => {
    const { html, headings } = addHeadingIds('<h2>What shipped</h2><h2>What shipped</h2>');
    expect(html).toContain('id="what-shipped"');
    expect(html).toContain('id="what-shipped-2"');
    expect(headings.map((h) => h.id)).toEqual(['what-shipped', 'what-shipped-2']);
  });

  it('takes the text from inline markup but leaves the markup in place', () => {
    const { html, headings } = addHeadingIds('<h2>Use <code>EF Core</code> here</h2>');
    expect(headings[0].text).toBe('Use EF Core here');
    expect(headings[0].id).toBe('use-ef-core-here');
    expect(html).toContain('<code>EF Core</code>');
  });

  it('decodes entities before slugging, so the id matches the visible text', () => {
    const { headings } = addHeadingIds('<h2>Ravi&#39;s rules &amp; exceptions</h2>');
    expect(headings[0].text).toBe("Ravi's rules & exceptions");
    expect(headings[0].id).toBe('ravi-s-rules-exceptions');
  });

  it('leaves h1 and h4 alone: the rail only lists h2, and h1 is the page title', () => {
    const { html, headings } = addHeadingIds('<h1>Title</h1><h4>Aside</h4>');
    expect(html).toBe('<h1>Title</h1><h4>Aside</h4>');
    expect(headings).toEqual([]);
  });

  it('skips a heading with no sluggable text rather than emitting an empty id', () => {
    const { html, headings } = addHeadingIds('<h2><code>---</code></h2>');
    expect(html).not.toContain('id=""');
    expect(headings).toEqual([]);
  });
});

describe('markDecisions', () => {
  it('turns a bold-lead paragraph into a card, dropping the trailing stop', () => {
    const { html, count } = markDecisions(
      '<p><strong>Staying in C#.</strong> So the rules would port.</p>',
    );
    expect(count).toBe(1);
    expect(html).toContain('<aside class="decision">');
    expect(html).toContain('<p class="decision-title">Staying in C#</p>');
    expect(html).toContain('<p class="decision-body">So the rules would port.</p>');
    expect(html).not.toContain('<strong>');
  });

  it('leaves an ordinary paragraph alone', () => {
    const input = '<p>Anyone can rewrite a customer form.</p>';
    expect(markDecisions(input)).toEqual({ html: input, count: 0 });
  });

  it('leaves a bold paragraph with no reasoning after it alone', () => {
    const input = '<p><strong>Just a bold lead.</strong></p>';
    expect(markDecisions(input).count).toBe(0);
  });

  it('does not fire on bold text that is not the lead', () => {
    const input = '<p>The point is <strong>versioned.</strong> That is the word.</p>';
    expect(markDecisions(input).count).toBe(0);
  });

  it('converts several decisions in one document', () => {
    const { count } = markDecisions(
      '<p><strong>One.</strong> First reason.</p><p>Filler.</p><p><strong>Two.</strong> Second reason.</p>',
    );
    expect(count).toBe(2);
  });
});

describe('assertOptionalMeta', () => {
  it('accepts an entry with neither field', () => {
    expect(() => assertOptionalMeta({}, 'f.md')).not.toThrow();
  });

  it('accepts a well-formed stack and metrics list', () => {
    expect(() =>
      assertOptionalMeta(
        { stack: ['EF Core'], metrics: [{ label: 'Releases', value: '15' }] },
        'f.md',
      ),
    ).not.toThrow();
  });

  it('rejects a stack that is not a list of strings', () => {
    expect(() => assertOptionalMeta({ stack: 'EF Core' }, 'f.md')).toThrow(/stack/);
    expect(() => assertOptionalMeta({ stack: ['', 'ok'] }, 'f.md')).toThrow(/stack/);
  });

  it('rejects a metric missing its label or value', () => {
    expect(() => assertOptionalMeta({ metrics: [{ value: '15' }] }, 'f.md')).toThrow(/label/);
    expect(() => assertOptionalMeta({ metrics: [{ label: 'Releases' }] }, 'f.md')).toThrow(/label/);
  });

  it('names the file so the build failure is actionable', () => {
    expect(() => assertOptionalMeta({ stack: 5 }, 'content/projects/x.md')).toThrow(
      /content\/projects\/x\.md/,
    );
  });

  it('accepts a numeric metric value, since yaml may parse one as a number', () => {
    expect(() => assertOptionalMeta({ metrics: [{ label: 'Apps', value: 3 }] }, 'f.md')).not.toThrow();
  });
});
