import { Component, computed, input } from '@angular/core';

export interface GraphNode {
  name: string;
  /** One short line under the name. Say what the thing is, not what it does. */
  detail?: string;
  /**
   * Only set this where a real published version exists. The graph is happy
   * without it, and an invented version number on a portfolio is a claim.
   */
  version?: string;
}

export interface SystemGraph {
  core: GraphNode;
  consumers: GraphNode[];
  caption?: string;
}

// Geometry. Laid out left to right: core, a routing trunk, then the consumers
// stacked in a column. All in user units; the svg scales to its container.
//
// SVG text does not wrap and cannot be clipped to its box without extra
// machinery, so the box widths are set against the longest label the data
// actually carries. Practical limits at the current 11px mono: about 30
// characters of detail on the core, about 26 on a consumer. Check the render if
// you exceed them.
const CORE = { x: 2, w: 218, h: 78 };
const CONSUMER = { x: 440, w: 194, h: 60 };
const GAP_Y = 16;
const TRUNK_X = 300;
const CORNER = 12;
const PAD_Y = 2;
const VIEW_W = 636;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  node: GraphNode;
}

/**
 * One core, its consumers, and the version each one is on.
 *
 * The site's signature element, and it is the same shape three times over:
 * federkleid behind four applications, a parsing core behind three front ends,
 * a set of business rules kept portable so they survived a rewrite. Same
 * component, different data.
 *
 * Rendering is inline SVG plus one CSS animation, so it costs no runtime
 * JavaScript after Angular has drawn it, and it prerenders as real markup.
 *
 * Accessibility: this is a diagram, not navigation. The nodes are not links,
 * because there is no page behind "Admin dashboard" and a link that goes
 * nowhere is worse than no link. Instead the svg carries a generated
 * description covering every node and version, and the caption stays visible.
 */
@Component({
  selector: 'app-system-graph',
  templateUrl: './system-graph.component.html',
  styleUrl: './system-graph.component.scss',
})
export class SystemGraphComponent {
  readonly graph = input.required<SystemGraph>();

  private readonly rows = computed(() => {
    const consumers = this.graph().consumers;
    const total = consumers.length * CONSUMER.h + (consumers.length - 1) * GAP_Y;
    const height = Math.max(total, CORE.h) + PAD_Y * 2;
    const top = PAD_Y + (height - PAD_Y * 2 - total) / 2;
    return { consumers, total, height, top };
  });

  readonly viewBox = computed(() => `0 0 ${VIEW_W} ${this.rows().height}`);

  readonly coreBox = computed<Box>(() => ({
    ...CORE,
    y: (this.rows().height - CORE.h) / 2,
    node: this.graph().core,
  }));

  readonly consumerBoxes = computed<Box[]>(() => {
    const { consumers, top } = this.rows();
    return consumers.map((node, i) => ({
      ...CONSUMER,
      y: top + i * (CONSUMER.h + GAP_Y),
      node,
    }));
  });

  /**
   * Orthogonal routing with eased corners, the way a trace is laid out on a
   * board. Straight through when a consumer happens to sit level with the core.
   */
  readonly traces = computed<string[]>(() => {
    const from = { x: CORE.x + CORE.w, y: this.coreBox().y + CORE.h / 2 };
    return this.consumerBoxes().map((box) => {
      const to = box.y + box.h / 2;
      if (Math.abs(to - from.y) < 0.5) return `M${from.x},${from.y} H${CONSUMER.x}`;
      const dir = to > from.y ? 1 : -1;
      return [
        `M${from.x},${from.y}`,
        `H${TRUNK_X - CORNER}`,
        `Q${TRUNK_X},${from.y} ${TRUNK_X},${from.y + dir * CORNER}`,
        `V${to - dir * CORNER}`,
        `Q${TRUNK_X},${to} ${TRUNK_X + CORNER},${to}`,
        `H${CONSUMER.x}`,
      ].join(' ');
    });
  });

  /** Junction pads, drawn only where a trace actually turns. */
  readonly pads = computed(() => {
    const coreY = this.coreBox().y + CORE.h / 2;
    return this.consumerBoxes()
      .map((box) => box.y + box.h / 2)
      .filter((y) => Math.abs(y - coreY) >= 0.5)
      .map((y) => ({ x: TRUNK_X, y }));
  });

  /** Staggered, so the releases do not arrive in lockstep. */
  delayFor(index: number): string {
    return `${index * 0.55}s`;
  }

  readonly description = computed(() => {
    const { core, consumers } = this.graph();
    const coreText = [core.name, core.detail, core.version && `version ${core.version}`]
      .filter(Boolean)
      .join(', ');
    const list = consumers
      .map((c) => [c.name, c.detail, c.version && `on ${c.version}`].filter(Boolean).join(', '))
      .join('; ');
    return `Diagram. A shared core, ${coreText}, with ${consumers.length} consumers: ${list}.`;
  });
}
