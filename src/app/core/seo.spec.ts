import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Seo, SITE_URL } from './seo';

describe('Seo', () => {
  let seo: Seo;
  let meta: Meta;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seo = TestBed.inject(Seo);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
  });

  it('sets the document title', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(title.getTitle()).toBe('A post');
  });

  it('sets the description and the open graph pair', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(meta.getTag('name="description"')?.content).toBe('About it.');
    expect(meta.getTag('property="og:title"')?.content).toBe('A post');
    expect(meta.getTag('property="og:description"')?.content).toBe('About it.');
  });

  it('builds an absolute canonical url and og:url', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(meta.getTag('property="og:url"')?.content).toBe(`${SITE_URL}/writing/a-post`);
  });

  it('sets an absolute og:image', () => {
    seo.set({ title: 'A post', description: 'About it.', path: '/writing/a-post' });
    expect(meta.getTag('property="og:image"')?.content).toBe(`${SITE_URL}/assets/og-default.png`);
  });

  it('overwrites rather than duplicating on a second call', () => {
    seo.set({ title: 'One', description: 'First.', path: '/one' });
    seo.set({ title: 'Two', description: 'Second.', path: '/two' });
    expect(meta.getTags('property="og:title"').length).toBe(1);
    expect(meta.getTag('property="og:title"')?.content).toBe('Two');
  });
});
