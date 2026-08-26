import { ArgumentRangeError, CoordinateFormatError } from '../errors';
import { tryParseFloat } from '../numbers';

/** Whether coordinates are absolute (A) or relative to the previous point (I). */
export enum CoordinateNotation {
  Absolute = 'Absolute',
  Incremental = 'Incremental',
}

/** Which end of a coordinate number the writer was allowed to drop zeros from. */
export enum ZeroOmission {
  /** "L" means leading zeros omitted, so the trailing digits are significant. */
  OmitLeading = 'OmitLeading',

  /** "T" means trailing zeros omitted (deprecated, but still emitted by old tools). */
  OmitTrailing = 'OmitTrailing',
}

/** The sign is stripped before this runs, so a bare run of digits is all that may remain. */
const DIGITS = /^\d+$/;

/**
 * The number format declared by `%FSLAX44Y44*%`: how many integer and decimal digits each
 * coordinate carries, and how the implicit decimal point is recovered.
 */
export class CoordinateFormat {
  /** Altium and most modern CAM tools default to 4.4 absolute, leading zeros omitted. */
  static readonly default = new CoordinateFormat(
    4,
    4,
    ZeroOmission.OmitLeading,
    CoordinateNotation.Absolute,
  );

  constructor(
    readonly integerDigits: number,
    readonly decimalDigits: number,
    readonly zeroOmission: ZeroOmission,
    readonly notation: CoordinateNotation,
  ) {
    if (!Number.isInteger(integerDigits) || integerDigits < 1 || integerDigits > 6)
      throw new ArgumentRangeError(`Integer digits must be 1..6, but were ${integerDigits}.`);
    if (!Number.isInteger(decimalDigits) || decimalDigits < 0 || decimalDigits > 7)
      throw new ArgumentRangeError(`Decimal digits must be 0..7, but were ${decimalDigits}.`);
  }

  get totalDigits(): number {
    return this.integerDigits + this.decimalDigits;
  }

  /**
   * Decodes a raw coordinate field (the digits after X/Y/I/J, e.g. `262890`) into a real
   * number in the file's units, so `26.289` for a 4.4 format.
   */
  decode(field: string): number {
    let raw = field;
    if (raw.length === 0) throw new CoordinateFormatError('Empty coordinate field.');

    let negative = false;
    if (raw[0] === '+' || raw[0] === '-') {
      negative = raw[0] === '-';
      raw = raw.slice(1);
    }

    // Some writers still emit an explicit decimal point even though the spec forbids it.
    if (raw.includes('.')) {
      const explicit = tryParseFloat(raw);
      if (explicit === null)
        throw new CoordinateFormatError(`Invalid coordinate field '${raw}'.`);

      return negative ? -explicit : explicit;
    }

    if (!DIGITS.test(raw))
      throw new CoordinateFormatError(`Invalid coordinate field '${raw}'.`);

    // With leading zeros omitted the trailing digits are already in place, so the digits parse
    // as-is. With trailing zeros omitted the dropped zeros must be restored on the right first.
    const digits =
      this.zeroOmission === ZeroOmission.OmitLeading || raw.length >= this.totalDigits
        ? Number(raw)
        : Number(raw.padEnd(this.totalDigits, '0'));

    const value = digits / Math.pow(10, this.decimalDigits);
    return negative ? -value : value;
  }

  toString(): string {
    const zeros = this.zeroOmission === ZeroOmission.OmitLeading ? 'L' : 'T';
    const notation = this.notation === CoordinateNotation.Absolute ? 'A' : 'I';
    const digits = `${this.integerDigits}${this.decimalDigits}`;
    return `${zeros}${notation}X${digits}Y${digits}`;
  }
}
