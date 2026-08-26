import { ApertureType } from '../models/aperture';
import { CoordinateFormat, CoordinateNotation, ZeroOmission } from '../models/coordinate-format';
import { GerberData } from '../models/gerber-data';
import { GerberElementType, Polarity } from '../models/gerber-element';
import { GerberUnit } from '../models/gerber-unit';
import { GerberParser } from './gerber-parser';

const MINIMAL_HEADER = '%FSLAX44Y44*%\n%MOMM*%\nG01*\n';

function parseSnippet(body: string): GerberData {
  return GerberParser.parse(`${MINIMAL_HEADER}${body}M02*\n`);
}

describe('GerberParser', () => {
  it('reads format and units', () => {
    const data = parseSnippet('');

    expect(data.unit).toBe(GerberUnit.Millimeters);
    expect(data.format.integerDigits).toBe(4);
    expect(data.format.decimalDigits).toBe(4);
    expect(data.format.zeroOmission).toBe(ZeroOmission.OmitLeading);
    expect(data.format.notation).toBe(CoordinateNotation.Absolute);
    expect(data.warnings).toEqual([]);
  });

  it('reads inch units', () => {
    expect(GerberParser.parse('%FSLAX23Y23*%\n%MOIN*%\nM02*\n').unit).toBe(GerberUnit.Inches);
  });

  it('parses the standard aperture templates', () => {
    const data = parseSnippet(
      '%ADD10C,0.5*%\n' +
        '%ADD11R,1.5X1.2*%\n' +
        '%ADD12O,1.4X0.35*%\n' +
        '%ADD13P,2.0X6X30*%\n' +
        '%ADD14C,0.6X0.3*%\n',
    );

    expect(data.apertures.get(10)!.type).toBe(ApertureType.Circle);
    expect(data.apertures.get(10)!.diameter).toBeCloseTo(0.5, 6);

    expect(data.apertures.get(11)!.type).toBe(ApertureType.Rectangle);
    expect(data.apertures.get(11)!.width).toBeCloseTo(1.5, 6);
    expect(data.apertures.get(11)!.height).toBeCloseTo(1.2, 6);

    expect(data.apertures.get(12)!.type).toBe(ApertureType.Obround);
    expect(data.apertures.get(12)!.width).toBeCloseTo(1.4, 6);
    expect(data.apertures.get(12)!.height).toBeCloseTo(0.35, 6);

    expect(data.apertures.get(13)!.type).toBe(ApertureType.Polygon);
    expect(data.apertures.get(13)!.diameter).toBeCloseTo(2, 6);
    expect(data.apertures.get(13)!.vertexCount).toBe(6);
    expect(data.apertures.get(13)!.rotation).toBeCloseTo(30, 6);

    expect(data.apertures.get(14)!.holeDiameter).toBeCloseTo(0.3, 6);
  });

  it('emits flashes at the current point', () => {
    const data = parseSnippet('%ADD10C,0.5*%\n' + 'D10*\n' + 'X100000Y200000D02*\n' + 'D03*\n');

    expect(data.elements.length).toBe(1);
    const flash = data.elements[0];
    expect(flash.type).toBe(GerberElementType.Flash);
    expect(flash.apertureCode).toBe(10);
    expect(flash.end.x).toBeCloseTo(10, 6);
    expect(flash.end.y).toBeCloseTo(20, 6);
  });

  it('keeps the previous value for omitted coordinates', () => {
    // This is exactly the "X..Y..D02* / D03* / Y..D02* / D03*" shape Altium emits.
    const data = parseSnippet(
      '%ADD10C,0.5*%\n' + 'D10*\n' + 'X100000Y200000D02*\nD03*\n' + 'Y300000D02*\nD03*\n',
    );

    expect(data.elements.length).toBe(2);
    expect(data.elements[1].end.x).toBeCloseTo(10, 6);
    expect(data.elements[1].end.y).toBeCloseTo(30, 6);
  });

  it('turns draws into strokes between the current and target points', () => {
    const data = parseSnippet('%ADD10C,0.25*%\n' + 'D10*\n' + 'X0Y0D02*\n' + 'X100000Y0D01*\n');

    expect(data.elements.length).toBe(1);
    const stroke = data.elements[0];
    expect(stroke.type).toBe(GerberElementType.Draw);
    expect(stroke.start.x).toBeCloseTo(0, 6);
    expect(stroke.end.x).toBeCloseTo(10, 6);
  });

  it('produces no elements for moves', () => {
    const data = parseSnippet('%ADD10C,0.5*%\nD10*\nX100000Y100000D02*\nX200000Y200000D02*\n');
    expect(data.elements).toEqual([]);
  });

  it('accumulates coordinates in incremental notation', () => {
    const data = GerberParser.parse(
      '%FSLIX44Y44*%\n%MOMM*%\n%ADD10C,0.5*%\nD10*\nX100000Y0D02*\nD03*\nX100000Y0D02*\nD03*\nM02*\n',
    );

    expect(data.format.notation).toBe(CoordinateNotation.Incremental);
    expect(data.elements[0].end.x).toBeCloseTo(10, 6);
    expect(data.elements[1].end.x).toBeCloseTo(20, 6);
  });

  it('carries polarity onto elements', () => {
    const data = parseSnippet(
      '%ADD10C,0.5*%\nD10*\n' + 'X0Y0D02*\nD03*\n' + '%LPC*%\n' + 'X100000Y0D02*\nD03*\n',
    );

    expect(data.elements[0].polarity).toBe(Polarity.Dark);
    expect(data.elements[1].polarity).toBe(Polarity.Clear);
  });

  it('accounts for aperture size in the bounding box', () => {
    // A 2 x 1 rectangle flashed at (10, 20) spans 9..11 by 19.5..20.5.
    const data = parseSnippet('%ADD10R,2X1*%\nD10*\nX100000Y200000D02*\nD03*\n');

    expect(data.boundingBox.minX).toBeCloseTo(9, 6);
    expect(data.boundingBox.maxX).toBeCloseTo(11, 6);
    expect(data.boundingBox.minY).toBeCloseTo(19.5, 6);
    expect(data.boundingBox.maxY).toBeCloseTo(20.5, 6);
  });

  it('captures comments and decodes Altium attribute comments', () => {
    const data = parseSnippet('G04 #@! TF.FilePolarity,Positive*\nG04 plain comment*\n');

    expect(data.attributes.get('.FilePolarity')).toBe('Positive');
    expect(data.comments).toContain('plain comment');
  });

  it('captures standard attribute commands', () => {
    const data = parseSnippet('%TF.FileFunction,Paste,Bot*%\n');
    expect(data.attributes.get('.FileFunction')).toBe('Paste,Bot');
  });

  it('degrades arcs to chords with a warning', () => {
    const data = parseSnippet('%ADD10C,0.25*%\nD10*\nX0Y0D02*\nG03X100000Y100000I0J100000D01*\n');

    expect(data.elements.length).toBe(1);
    expect(data.elements[0].type).toBe(GerberElementType.Draw);
    expect(data.warnings.some((w) => w.toLowerCase().includes('arc'))).toBe(true);
  });

  it('skips region contours with a warning', () => {
    const data = parseSnippet(
      '%ADD10C,0.25*%\nD10*\nG36*\nX0Y0D02*\nX100000Y0D01*\nX100000Y100000D01*\nG37*\n',
    );

    expect(data.elements).toEqual([]);
    expect(data.warnings.some((w) => w.includes('G36'))).toBe(true);
  });

  it('warns instead of throwing when an undefined aperture is selected', () => {
    const data = parseSnippet('D99*\nX0Y0D02*\nD03*\n');
    expect(data.warnings.some((w) => w.includes('D99'))).toBe(true);
  });

  it('falls back and warns when format and units are missing', () => {
    const data = GerberParser.parse('%ADD10C,0.5*%\nD10*\nX0Y0D02*\nD03*\nM02*\n');

    expect(data.format.integerDigits).toBe(CoordinateFormat.default.integerDigits);
    expect(data.warnings.some((w) => w.includes('%FS'))).toBe(true);
    expect(data.warnings.some((w) => w.includes('%MO'))).toBe(true);
  });

  it('warns when the end-of-file command is missing', () => {
    const data = GerberParser.parse(MINIMAL_HEADER);
    expect(data.warnings.some((w) => w.includes('M02'))).toBe(true);
  });

  it('stops parsing at M02', () => {
    const data = GerberParser.parse(
      `${MINIMAL_HEADER}%ADD10C,0.5*%\nD10*\nX0Y0D02*\nD03*\nM02*\nX100000Y0D02*\nD03*\n`,
    );

    expect(data.elements.length).toBe(1);
  });

  it('records the source line of each element', () => {
    const data = parseSnippet('%ADD10C,0.5*%\nD10*\nX0Y0D02*\nD03*\n');

    // Header is 3 lines, then %ADD (4), D10 (5), move (6), flash (7).
    expect(data.elements.length).toBe(1);
    expect(data.elements[0].lineNumber).toBe(7);
  });

  it('keeps the file name it was handed', () => {
    expect(GerberParser.parse(`${MINIMAL_HEADER}M02*\n`, 'board.gbr').fileName).toBe('board.gbr');
  });

  it('warns rather than throwing on an out-of-range %FS', () => {
    // Web-only divergence from the .NET core, which lets the ArgumentOutOfRangeException escape.
    const data = GerberParser.parse('%FSLAX04Y04*%\n%MOMM*%\nM02*\n');

    expect(data.format.integerDigits).toBe(CoordinateFormat.default.integerDigits);
    expect(data.warnings.some((w) => w.includes('out of range'))).toBe(true);
  });
});
