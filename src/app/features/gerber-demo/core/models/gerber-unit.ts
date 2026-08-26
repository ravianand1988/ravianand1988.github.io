/** Unit of measure declared by the %MO..*% command (or the deprecated G70/G71). */
export enum GerberUnit {
  Millimeters = 'Millimeters',
  Inches = 'Inches',
}

export const MILLIMETERS_PER_INCH = 25.4;

/** Converts a value expressed in `unit` to millimetres. */
export function toMillimeters(unit: GerberUnit, value: number): number {
  return unit === GerberUnit.Inches ? value * MILLIMETERS_PER_INCH : value;
}

/** Converts a value expressed in `unit` to inches. */
export function toInches(unit: GerberUnit, value: number): number {
  return unit === GerberUnit.Inches ? value : value / MILLIMETERS_PER_INCH;
}

/** Reinterprets a length currently expressed in `from` in the `to` unit. */
export function convertLength(value: number, from: GerberUnit, to: GerberUnit): number {
  if (from === to) return value;
  return to === GerberUnit.Millimeters ? toMillimeters(from, value) : toInches(from, value);
}

/** Short suffix for readouts. */
export function unitSuffix(unit: GerberUnit): string {
  return unit === GerberUnit.Inches ? 'in' : 'mm';
}
