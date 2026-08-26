import { TestBed } from '@angular/core/testing';
import { ContentService } from './content';

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContentService);
  });

  it('returns posts newest first', () => {
    const dates = service.allPosts().map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('caps recentPosts at the requested count', () => {
    expect(service.recentPosts(2).length).toBeLessThanOrEqual(2);
  });

  it('returns undefined for an unknown slug', () => {
    expect(service.postBySlug('no-such-post')).toBeUndefined();
  });

  it('returns every post when no pillar is selected', () => {
    expect(service.postsByPillar(null).length).toBe(service.allPosts().length);
  });

  it('filters to a single pillar', () => {
    const filtered = service.postsByPillar('migrations');
    expect(filtered.every((p) => p.pillar === 'migrations')).toBe(true);
  });
});
