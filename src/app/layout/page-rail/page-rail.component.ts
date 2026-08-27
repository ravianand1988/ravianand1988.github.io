import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One labelled block of rail metadata: a heading and the values under it. */
export interface RailGroup {
  label: string;
  values: string[];
}

/** A heading in the article, for the on-this-page list. */
export interface RailSection {
  id: string;
  text: string;
}

/**
 * The metadata rail.
 *
 * Above the layout breakpoint it is a sticky column of mono labels beside the
 * prose. Below it, it becomes a horizontally scrolling row of chips under the
 * title, and the on-this-page list collapses into a details element. That is a
 * different information hierarchy rather than the desktop rail made narrower:
 * stacking it would put a column of metadata between the reader and the first
 * paragraph.
 *
 * The on-this-page links use routerLink with a fragment rather than a bare
 * href="#id". index.html carries <base href="/">, and a relative fragment
 * resolves against the base, not the current document, so href="#what-shipped"
 * on /projects/distribution-erp navigated to the homepage. routerLink builds the
 * full path, stays correct as the route changes, and still emits a real href so
 * the anchors work before hydration.
 */
@Component({
  selector: 'app-page-rail',
  imports: [RouterLink],
  templateUrl: './page-rail.component.html',
  styleUrl: './page-rail.component.scss',
})
export class PageRailComponent {
  /**
   * Controls belong in the rail rather than above the list they filter, so
   * project them in. Everything else the rail shows is data.
   */
  readonly groups = input<RailGroup[]>([]);
  readonly sections = input<RailSection[]>([]);
}
