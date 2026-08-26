import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { WritingPostComponent } from './writing-post.component';
import { ContentService } from '../../core/content';

describe('WritingPostComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'writing/:slug', component: WritingPostComponent }],
          withComponentInputBinding(),
        ),
      ],
    }).compileComponents();
  });

  it('renders the post body and sets the document title from the post', async () => {
    const content = TestBed.inject(ContentService);
    const post = content.allPosts()[0];
    if (!post) {
      // No posts authored yet (Task 12 adds them). The route still has to resolve.
      const harness = await RouterTestingHarness.create('/writing/anything');
      expect(harness.routeNativeElement?.textContent).toContain('not here');
      return;
    }

    const harness = await RouterTestingHarness.create(`/writing/${post.slug}`);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(post.title);
    expect(TestBed.inject(Title).getTitle()).toBe(post.title);
  });

  it('shows a not-found message for an unknown slug', async () => {
    const harness = await RouterTestingHarness.create('/writing/definitely-not-a-post');
    expect(harness.routeNativeElement?.textContent).toContain('not here');
  });
});
