import { GerberParser, GerberUnit } from 'ngx-gerber';

/**
 * The parser's own suite lives in the ngx-gerber package. This is the site's
 * integration check: the published package, against the real Altium layer this
 * site actually serves. It exists so that upgrading the dependency cannot
 * silently change what the case study page renders.
 */
describe('ngx-gerber against the sample this site ships', () => {
  async function sample(): Promise<string> {
    const { readFile } = await import('node:fs/promises');
    return readFile('src/assets/samples/PCB1.GBP', 'utf8');
  }

  it('parses the shipped sample with no warnings', async () => {
    const data = GerberParser.parse(await sample(), 'PCB1.GBP');

    expect(data.warnings).toEqual([]);
    expect(data.unit).toBe(GerberUnit.Millimeters);
  });

  it('finds the geometry the case study describes', async () => {
    const data = GerberParser.parse(await sample(), 'PCB1.GBP');

    // The figures quoted on /projects/gerber-viewer. If a dependency upgrade
    // changes them, the page is making a false claim and this fails first.
    expect(data.elements.length).toBe(123);
    expect(data.flashCount).toBe(123);
    expect(data.apertures.size).toBe(10);
    expect(data.boundingBox.isEmpty).toBe(false);
    expect(data.boundingBox.width).toBeCloseTo(32.379, 3);
    expect(data.boundingBox.height).toBeCloseTo(45.039, 3);
  });
});
