import { ArgumentRangeError, CoordinateFormatError } from '../errors';
import { CoordinateFormat, CoordinateNotation, ZeroOmission } from './coordinate-format';

describe('CoordinateFormat', () => {
  const format44 = new CoordinateFormat(
    4,
    4,
    ZeroOmission.OmitLeading,
    CoordinateNotation.Absolute,
  );

  it('decodes leading-zero-omitted fields', () => {
    const cases: [raw: string, expected: number][] = [
      ['262890', 26.289], // as it appears in PCB1.GBP
      ['73320', 7.332],
      ['0', 0],
      ['1', 0.0001], // leading zeros omitted, so a lone digit is the last decimal
      ['-73320', -7.332],
      ['+73320', 7.332],
    ];

    for (const [raw, expected] of cases) {
      expect(format44.decode(raw)).toBeCloseTo(expected, 6);
    }
  });

  it('decodes trailing-zero-omitted fields', () => {
    const format = new CoordinateFormat(
      2,
      4,
      ZeroOmission.OmitTrailing,
      CoordinateNotation.Absolute,
    );

    // "26" pads right to "260000" -> 26.0000
    expect(format.decode('26')).toBeCloseTo(26, 6);
    expect(format.decode('265')).toBeCloseTo(26.5, 6);
  });

  it('honours the decimal digit count', () => {
    const format23 = new CoordinateFormat(
      2,
      3,
      ZeroOmission.OmitLeading,
      CoordinateNotation.Absolute,
    );

    expect(format23.decode('26289')).toBeCloseTo(26.289, 6);
  });

  it('accepts an explicit decimal point even though the spec forbids it', () => {
    expect(format44.decode('-26.289')).toBeCloseTo(-26.289, 6);
  });

  it('rejects non-numeric fields', () => {
    expect(() => format44.decode('12A4')).toThrowError(CoordinateFormatError);
  });

  it('rejects empty fields', () => {
    expect(() => format44.decode('')).toThrowError(CoordinateFormatError);
  });

  it('rejects out-of-range integer digits', () => {
    for (const integerDigits of [0, 7]) {
      expect(
        () =>
          new CoordinateFormat(
            integerDigits,
            4,
            ZeroOmission.OmitLeading,
            CoordinateNotation.Absolute,
          ),
      ).toThrowError(ArgumentRangeError);
    }
  });

  it('round-trips its own %FS spelling', () => {
    expect(format44.toString()).toBe('LAX44Y44');
    expect(CoordinateFormat.default.toString()).toBe('LAX44Y44');
  });
});
