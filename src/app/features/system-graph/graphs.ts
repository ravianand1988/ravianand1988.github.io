import { SystemGraph } from './system-graph.component';

/**
 * Graph data, keyed by project slug.
 *
 * Every name and every relationship here comes from the case study prose in
 * content/projects/. Nothing is inferred. Version numbers appear only where a
 * published version actually exists and can be checked: ngx-gerber is on npm,
 * so its version is real. federkleid's release numbers are not public anywhere,
 * so its nodes carry no version rather than a plausible-looking one.
 */

/** federkleid and byrd's three dashboards. Also the homepage hero. */
export const FEDERKLEID_GRAPH: SystemGraph = {
  core: { name: 'federkleid', detail: 'shared Angular design system' },
  consumers: [
    { name: 'Customer', detail: 'dashboard' },
    { name: 'Partner', detail: 'dashboard' },
    { name: 'Admin', detail: 'dashboard' },
  ],
  caption:
    'Three applications against one logistics platform, consuming one versioned system. Real version numbers are what let them upgrade on their own schedule instead of all breaking together.',
};

const GERBER_GRAPH: SystemGraph = {
  core: { name: 'Parsing core', detail: 'RS-274X, no rendering in it', version: '0.1.1' },
  consumers: [
    { name: '.NET library', detail: 'cross-platform' },
    { name: 'WPF shell', detail: 'desktop' },
    { name: 'Canvas renderer', detail: 'Angular, in the browser' },
  ],
  caption:
    'Once the core knows nothing about how it will be displayed, adding the browser target stops being a rewrite and becomes a renderer.',
};

export const PROJECT_GRAPHS: Record<string, SystemGraph> = {
  'byrd-design-system': FEDERKLEID_GRAPH,
  'gerber-viewer': GERBER_GRAPH,
};
