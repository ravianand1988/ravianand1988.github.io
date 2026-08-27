import { SystemGraph } from './system-graph.component';

/**
 * Graph data, keyed by project slug.
 *
 * Names, counts and relationships come from the case study prose in
 * content/projects/ and from the master CV. Version numbers appear only where a
 * published version actually exists and can be checked: ngx-gerber is on npm, so
 * its version is real. federkleid's release numbers are not public anywhere, so
 * its nodes carry no version rather than a plausible-looking one.
 *
 * One inference, flagged because it is the only one: the CV states that four
 * production applications build on federkleid, and separately describes the
 * Customer dashboard, the Partner dashboard, the Admin dashboard and the
 * white-label Returns Portal. It does not say in one sentence that the Returns
 * Portal is the fourth consumer. The count is quoted; the identity of the fourth
 * is read off the surrounding bullets and should be confirmed.
 */

/** federkleid and byrd's four production frontends. Also the homepage hero. */
export const FEDERKLEID_GRAPH: SystemGraph = {
  core: { name: 'federkleid', detail: '77 components, 166 icons' },
  consumers: [
    { name: 'Customer', detail: 'seller dashboard' },
    { name: 'Partner', detail: 'warehouse dashboard' },
    { name: 'Admin', detail: 'internal dashboard' },
    { name: 'Returns Portal', detail: 'white-label, public' },
  ],
  caption:
    'Four applications against one logistics platform, around 309,000 lines of TypeScript, consuming one versioned system. Real version numbers are what let them upgrade on their own schedule instead of all breaking together.',
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
