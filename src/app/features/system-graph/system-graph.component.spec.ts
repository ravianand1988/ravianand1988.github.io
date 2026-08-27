import { TestBed } from '@angular/core/testing';
import { SystemGraphComponent, SystemGraph } from './system-graph.component';
import { PROJECT_GRAPHS, FEDERKLEID_GRAPH } from './graphs';

function render(graph: SystemGraph) {
  const fixture = TestBed.createComponent(SystemGraphComponent);
  fixture.componentRef.setInput('graph', graph);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

const THREE: SystemGraph = {
  core: { name: 'Core', detail: 'the shared part' },
  consumers: [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }],
};

describe('SystemGraphComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SystemGraphComponent] }).compileComponents();
  });

  it('routes the consumer level with the core as a straight trace', () => {
    const { cmp } = render(THREE);
    const traces = cmp.traces();
    expect(traces).toHaveLength(3);
    // Middle of three sits on the core's centre line.
    expect(traces[1]).toMatch(/^M[\d.]+,[\d.]+ H[\d.]+$/);
    expect(traces[0]).toContain('Q');
    expect(traces[2]).toContain('Q');
  });

  it('draws a junction pad only where a trace actually turns', () => {
    const { cmp } = render(THREE);
    // Three consumers, one of them straight through, so two pads.
    expect(cmp.pads()).toHaveLength(2);
  });

  it('draws no pads when every consumer is level with the core', () => {
    const { cmp } = render({ core: { name: 'Core' }, consumers: [{ name: 'Only' }] });
    expect(cmp.pads()).toHaveLength(0);
    expect(cmp.traces()[0]).not.toContain('Q');
  });

  it('grows the viewBox with the number of consumers', () => {
    const two = render({ ...THREE, consumers: [{ name: 'A' }, { name: 'B' }] }).cmp.viewBox();
    const four = render({
      ...THREE,
      consumers: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
    }).cmp.viewBox();
    const heightOf = (v: string) => Number(v.split(' ')[3]);
    expect(heightOf(four)).toBeGreaterThan(heightOf(two));
  });

  it('keeps a minimum height for a single consumer, so the core box still fits', () => {
    const { cmp } = render({ core: { name: 'Core' }, consumers: [{ name: 'Only' }] });
    expect(Number(cmp.viewBox().split(' ')[3])).toBeGreaterThanOrEqual(78);
  });

  it('starts every trace at the core box edge', () => {
    const { cmp } = render(THREE);
    const core = cmp.coreBox();
    const startX = core.x + core.w;
    for (const d of cmp.traces()) {
      expect(d.startsWith(`M${startX},`)).toBe(true);
    }
  });

  it('staggers the pulse so releases do not arrive in lockstep', () => {
    const { cmp } = render(THREE);
    expect([cmp.delayFor(0), cmp.delayFor(1), cmp.delayFor(2)]).toEqual(['0s', '0.55s', '1.1s']);
  });

  it('renders a version only when the data carries one', () => {
    const without = render(THREE).el;
    expect(without.querySelectorAll('.version')).toHaveLength(0);

    const withVersion = render({
      core: { name: 'Core', version: '0.1.1' },
      consumers: [{ name: 'One', version: '0.1.0' }],
    }).el;
    const versions = Array.from(withVersion.querySelectorAll('.version')).map((n) =>
      n.textContent?.trim(),
    );
    expect(versions).toEqual(['publishes 0.1.1', 'on 0.1.0']);
  });

  it('describes every node for screen readers, since the nodes are not links', () => {
    const { el } = render({
      core: { name: 'federkleid', detail: 'design system' },
      consumers: [{ name: 'Customer' }, { name: 'Admin', version: '2.2.1' }],
    });
    const svg = el.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label')!;
    expect(label).toContain('federkleid, design system');
    expect(label).toContain('2 consumers');
    expect(label).toContain('Customer');
    expect(label).toContain('Admin, on 2.2.1');
    expect(el.querySelectorAll('a')).toHaveLength(0);
  });

  it('shows the caption when one is given', () => {
    const { el } = render({ ...THREE, caption: 'One core, three consumers.' });
    expect(el.querySelector('figcaption')?.textContent?.trim()).toBe('One core, three consumers.');
  });
});

describe('graph data', () => {
  it('claims a version only where a real published one exists', () => {
    // ngx-gerber is on npm so its version is checkable; federkleid's release
    // numbers are not public, so inventing one would be a fabricated claim.
    expect(PROJECT_GRAPHS['gerber-viewer'].core.version).toBe('0.1.1');
    expect(FEDERKLEID_GRAPH.core.version).toBeUndefined();
    for (const consumer of FEDERKLEID_GRAPH.consumers) {
      expect(consumer.version).toBeUndefined();
    }
  });

  it('covers the two case studies that have a core-and-consumers shape', () => {
    expect(Object.keys(PROJECT_GRAPHS).sort()).toEqual(['byrd-design-system', 'gerber-viewer']);
    // The ERP migration is a sequencing story, so it deliberately has no graph.
    expect(PROJECT_GRAPHS['distribution-erp']).toBeUndefined();
  });
});
