import { Component, input } from '@angular/core';

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
 */
@Component({
  selector: 'app-page-rail',
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
