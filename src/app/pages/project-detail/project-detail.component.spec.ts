import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProjectDetailComponent } from './project-detail.component';

describe('ProjectDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'projects/:slug', component: ProjectDetailComponent }],
          withComponentInputBinding(),
        ),
      ],
    }).compileComponents();
  });

  it('shows a not-found message for an unknown slug', async () => {
    const harness = await RouterTestingHarness.create('/projects/definitely-not-a-project');
    expect(harness.routeNativeElement?.textContent).toContain('not here');
  });
});
