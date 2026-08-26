import { GerberParseError } from '../errors';
import { GerberParser } from '../parser/gerber-parser';
import { Aperture, ApertureType } from './aperture';
import { MacroCircleShape, MacroOutlineShape } from './macro-shape';

function parseSingleAperture(macroAndAperture: string): Aperture {
  const data = GerberParser.parse(`%FSLAX44Y44*%\n%MOMM*%\n${macroAndAperture}M02*\n`);
  const apertures = [...data.apertures.values()];
  expect(apertures.length).toBe(1);
  return apertures[0];
}

function singleOutline(aperture: Aperture): MacroOutlineShape {
  expect(aperture.macroShapes.length).toBe(1);
  const shape = aperture.macroShapes[0];
  expect(shape).toBeInstanceOf(MacroOutlineShape);
  return shape as MacroOutlineShape;
}

const minX = (outline: MacroOutlineShape) => Math.min(...outline.vertices.map((v) => v.x));
const maxX = (outline: MacroOutlineShape) => Math.max(...outline.vertices.map((v) => v.x));
const minY = (outline: MacroOutlineShape) => Math.min(...outline.vertices.map((v) => v.y));
const maxY = (outline: MacroOutlineShape) => Math.max(...outline.vertices.map((v) => v.y));

describe('ApertureMacro', () => {
  it('turns a centre-line primitive into a rectangle', () => {
    const outline = singleOutline(parseSingleAperture('%AMBAR*21,1,2,1,0,0,0*%\n%ADD10BAR*%\n'));

    expect(outline.exposure).toBe(true);
    expect(outline.vertices.length).toBe(4);
    expect(minX(outline)).toBeCloseTo(-1, 6);
    expect(maxX(outline)).toBeCloseTo(1, 6);
    expect(minY(outline)).toBeCloseTo(-0.5, 6);
    expect(maxY(outline)).toBeCloseTo(0.5, 6);
  });

  it('applies rotation about the macro origin', () => {
    // A 2 x 1 bar centred on the origin, rotated 90 degrees, becomes 1 x 2.
    const aperture = parseSingleAperture('%AMBAR*21,1,2,1,0,0,90*%\n%ADD10BAR*%\n');

    expect(aperture.halfWidth * 2).toBeCloseTo(1, 6);
    expect(aperture.halfHeight * 2).toBeCloseTo(2, 6);
  });

  it('offsets a lower-left-line primitive from its corner', () => {
    const outline = singleOutline(parseSingleAperture('%AMLL*22,1,2,1,0,0,0*%\n%ADD10LL*%\n'));

    expect(minX(outline)).toBeCloseTo(0, 6);
    expect(maxX(outline)).toBeCloseTo(2, 6);
    expect(minY(outline)).toBeCloseTo(0, 6);
    expect(maxY(outline)).toBeCloseTo(1, 6);
  });

  it('thickens a vector-line primitive along its normal', () => {
    const outline = singleOutline(
      parseSingleAperture('%AMVEC*20,1,0.5,0,0,2,0,0*%\n%ADD10VEC*%\n'),
    );

    expect(minX(outline)).toBeCloseTo(0, 6);
    expect(maxX(outline)).toBeCloseTo(2, 6);
    expect(minY(outline)).toBeCloseTo(-0.25, 6);
    expect(maxY(outline)).toBeCloseTo(0.25, 6);
  });

  it('keeps the vertices of an outline primitive', () => {
    const outline = singleOutline(
      parseSingleAperture('%AMTRI*4,1,3,0,0,1,0,0,1,0,0,0*%\n%ADD10TRI*%\n'),
    );

    expect(outline.vertices.length).toBe(4);
    expect(maxX(outline)).toBeCloseTo(1, 6);
    expect(maxY(outline)).toBeCloseTo(1, 6);
  });

  it('produces the requested vertex count for a regular polygon', () => {
    const outline = singleOutline(parseSingleAperture('%AMHEX*5,1,6,0,0,2,0*%\n%ADD10HEX*%\n'));

    expect(outline.vertices.length).toBe(6);
    expect(maxX(outline)).toBeCloseTo(1, 6);
  });

  it('keeps the exposure flag of clear primitives', () => {
    const shapes = parseSingleAperture('%AMDONUT*1,1,2,0,0*1,0,1,0,0*%\n%ADD10DONUT*%\n')
      .macroShapes;

    expect(shapes.map((shape) => shape.exposure)).toEqual([true, false]);
  });

  it('binds arguments to dollar variables', () => {
    const aperture = parseSingleAperture('%AMPAD*21,1,$1,$2,0,0,0*%\n%ADD10PAD,3X2*%\n');

    expect(aperture.halfWidth * 2).toBeCloseTo(3, 6);
    expect(aperture.halfHeight * 2).toBeCloseTo(2, 6);
  });

  it('evaluates arithmetic and assignments', () => {
    // $3 = $1 * 0.5 + 1 = 3; the bar is then 3 wide and (4 - 1) / 2 = 1.5 tall.
    const aperture = parseSingleAperture(
      '%AMCALC*$3=$1x0.5+1*21,1,$3,($2-1)/2,0,0,0*%\n%ADD10CALC,4X4*%\n',
    );

    expect(aperture.halfWidth * 2).toBeCloseTo(3, 6);
    expect(aperture.halfHeight * 2).toBeCloseTo(1.5, 6);
  });

  it('draws nothing for macro comment primitives', () => {
    const aperture = parseSingleAperture(
      '%AMNOTE*0 this is a comment, with a comma*1,1,1,0,0*%\n%ADD10NOTE*%\n',
    );

    expect(aperture.macroShapes.length).toBe(1);
  });

  it('reports unsupported primitives clearly', () => {
    const aperture = parseSingleAperture('%AMTHERM*7,0,0,2,1.5,0.3,0*%\n%ADD10THERM*%\n');

    expect(() => aperture.macroShapes).toThrowError(GerberParseError);
    expect(() => aperture.macroShapes).toThrowError(/primitive 7/i);
  });

  it('warns and renders nothing when the macro is undefined', () => {
    const data = GerberParser.parse('%FSLAX44Y44*%\n%MOMM*%\n%ADD10MISSING*%\nM02*\n');

    expect(data.warnings.some((w) => w.includes('MISSING'))).toBe(true);
    expect(data.apertures.get(10)!.macroShapes.length).toBe(0);
  });

  it("resolves Altium's rounded-rectangle macro to its declared size", () => {
    // Verbatim from PCB1.GBP: Altium's AMPARAMS comment declares XSize=1.9554, YSize=0.4208.
    const source = [
      '%FSLAX44Y44*%',
      '%MOMM*%',
      '%AMROUNDEDRECTD29*',
      '21,1,1.9554,0.0000,0,0,180.0*',
      '21,1,1.5347,0.4208,0,0,180.0*',
      '1,1,0.4208,-0.7673,0.0000*',
      '1,1,0.4208,0.7673,0.0000*',
      '1,1,0.4208,0.7673,0.0000*',
      '1,1,0.4208,-0.7673,0.0000*',
      '%',
      '%ADD29ROUNDEDRECTD29*%',
      'M02*',
    ].join('\n');

    const apertures = [...GerberParser.parse(source).apertures.values()];
    expect(apertures.length).toBe(1);

    const aperture = apertures[0];
    expect(aperture.type).toBe(ApertureType.Macro);
    expect(aperture.macroName).toBe('ROUNDEDRECTD29');
    expect(aperture.macroShapes.length).toBe(6);
    expect(aperture.macroShapes.filter((s) => s instanceof MacroOutlineShape).length).toBe(2);
    expect(aperture.macroShapes.filter((s) => s instanceof MacroCircleShape).length).toBe(4);
    expect(aperture.halfWidth * 2).toBeCloseTo(1.9554, 4);
    expect(aperture.halfHeight * 2).toBeCloseTo(0.4208, 4);
  });
});
