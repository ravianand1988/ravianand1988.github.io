import { ApertureType } from './models/aperture';
import { GerberData } from './models/gerber-data';
import { GerberElementType, Polarity } from './models/gerber-element';
import { GerberUnit } from './models/gerber-unit';
import { GerberParser } from './parser/gerber-parser';

/**
 * End-to-end checks against the real Altium-generated paste layer in `samples/PCB1.GBP`, which
 * `angular.json` copies out of the repository root into the served `samples/` folder.
 */
describe('PCB1.GBP sample', () => {
  let data: GerberData;

  beforeAll(async () => {
    data = GerberParser.parse(await fetchSample(), 'PCB1.GBP');
  });

  /**
   * Read from disk rather than over HTTP. The original suite ran under Karma in a
   * browser and fetched the served asset; here the same specs run under Vitest in
   * Node, where the file is simply on the filesystem.
   */
  async function fetchSample(): Promise<string> {
    const { readFile } = await import('node:fs/promises');
    // Resolved from the project root, not import.meta.url: the spec is bundled
    // before it runs, so import.meta.url does not point at this source file.
    return readFile('src/assets/samples/PCB1.GBP', 'utf8');
  }

  it('parses without warnings', () => {
    expect(data.warnings).toEqual([]);
  });

  it('reads the declared format', () => {
    expect(data.unit).toBe(GerberUnit.Millimeters);
    expect(data.format.toString()).toBe('LAX44Y44');
  });

  it('finds every aperture definition', () => {
    expect(data.apertures.size).toBe(10);
    expect([...data.apertures.keys()].sort((a, b) => a - b)).toEqual([
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    ]);

    const types = [...data.apertures.values()].map((a) => a.type);
    expect(types.filter((t) => t === ApertureType.Rectangle).length).toBe(7);
    expect(types.filter((t) => t === ApertureType.Obround).length).toBe(2);
    expect(types.filter((t) => t === ApertureType.Macro).length).toBe(1);
  });

  it('reads the macro aperture', () => {
    const d29 = data.apertures.get(29)!;

    expect(d29.macroName).toBe('ROUNDEDRECTD29');
    expect(d29.macro).not.toBeNull();
    expect(d29.macroShapes.length).toBe(6);
    expect(d29.halfWidth * 2).toBeCloseTo(1.9554, 4);
    expect(d29.halfHeight * 2).toBeCloseTo(0.4208, 4);
  });

  it('finds every flash and no draws', () => {
    // A paste layer is pads only: 123 D03 flashes, no D01 strokes.
    expect(data.flashCount).toBe(123);
    expect(data.drawCount).toBe(0);
    expect(data.elements.length).toBe(123);
    expect(data.elements.every((e) => e.polarity === Polarity.Dark)).toBe(true);
  });

  it('resolves every element to a defined aperture', () => {
    expect(data.elements.every((e) => data.getAperture(e) !== null)).toBe(true);
  });

  it('places the first flash where the file says it is', () => {
    // X262890Y73320D02* followed by D03*, in 4.4 format.
    const first = data.elements[0];

    expect(first.type).toBe(GerberElementType.Flash);
    expect(first.apertureCode).toBe(20);
    expect(first.end.x).toBeCloseTo(26.289, 6);
    expect(first.end.y).toBeCloseTo(7.332, 6);
  });

  it('covers the whole board outline with its bounding box', () => {
    const bounds = data.boundingBox;

    expect(bounds.isEmpty).toBe(false);
    expect(bounds.minX).toBeCloseTo(1.341, 3);
    expect(bounds.maxX).toBeCloseTo(33.72, 3);
    expect(bounds.minY).toBeCloseTo(6.732, 3);
    expect(bounds.maxY).toBeCloseTo(51.771, 3);
    expect(bounds.width).toBeCloseTo(32.379, 3);
    expect(bounds.height).toBeCloseTo(45.039, 3);
  });

  it('reads Altium attribute comments', () => {
    expect(data.attributes.get('.FilePolarity')).toBe('Positive');
    expect(data.attributes.get('.GenerationSoftware')!.startsWith('Altium Limited')).toBe(true);
    expect(data.attributes.get('.SameCoordinates')).toBe(
      '0F820196-FC73-482F-9D33-B7CD7C100F4A',
    );
  });

  it('converts coordinates to inches on request', () => {
    const inInches = data.elements[0].end.toInches(data.unit);
    expect(inInches.x).toBeCloseTo(26.289 / 25.4, 6);
  });
});
