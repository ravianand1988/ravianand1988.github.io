/**
 * Culture-invariant number helpers. JavaScript's `Number()` is far more permissive than
 * .NET's `double.TryParse(..., NumberStyles.Float, InvariantCulture)`, which accepts `""`,
 * `"0x10"`, `"Infinity"` and whitespace-only input, so every parse in the Gerber core goes
 * through one of these, which validate the shape first.
 */

/** NumberStyles.Float: optional sign, decimal point, exponent. */
const FLOAT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/** NumberStyles.Integer: optional sign, digits only. */
const INTEGER = /^[+-]?\d+$/;

/** NumberStyles.None: digits only. */
const DIGITS = /^\d+$/;

export function tryParseFloat(text: string): number | null {
  const trimmed = text.trim();
  return FLOAT.test(trimmed) ? Number(trimmed) : null;
}

export function tryParseInteger(text: string): number | null {
  const trimmed = text.trim();
  return INTEGER.test(trimmed) ? Number(trimmed) : null;
}

export function tryParseDigits(text: string): number | null {
  return DIGITS.test(text) ? Number(text) : null;
}

/**
 * Equivalent of .NET's `"0.####"`-style formats: round to at most `maxDecimals` places and
 * drop the trailing zeros, keeping at least one integer digit.
 */
export function formatNumber(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value)) return String(value);

  const normalised = Object.is(value, -0) ? 0 : value;
  const fixed = normalised.toFixed(maxDecimals);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
}

/** Left-pads an integer with zeros, for messages such as "G02" and "D03". */
export function padCode(value: number, width = 2): string {
  const negative = value < 0;
  const digits = Math.abs(value).toString().padStart(width, '0');
  return negative ? `-${digits}` : digits;
}
