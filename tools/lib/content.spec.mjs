import { describe, it, expect } from 'vitest';
import {
  slugify,
  isPublished,
  byDateDesc,
  assertEntry,
  buildRssXml,
  buildSitemapXml,
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
