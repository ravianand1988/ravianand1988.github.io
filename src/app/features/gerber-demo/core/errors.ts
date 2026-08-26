/**
 * Raised for a construct the parser recognises but cannot represent. Mirrors
 * `GerberParseException` in the .NET core.
 */
export class GerberParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GerberParseError';
  }
}

/**
 * Raised when a coordinate field cannot be decoded. Mirrors the `FormatException` that
 * `CoordinateFormat.Decode` throws in the .NET core; the parser catches it and warns.
 */
export class CoordinateFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoordinateFormatError';
  }
}

/** Mirrors `ArgumentOutOfRangeException` from the .NET `CoordinateFormat` constructor. */
export class ArgumentRangeError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'ArgumentRangeError';
  }
}
