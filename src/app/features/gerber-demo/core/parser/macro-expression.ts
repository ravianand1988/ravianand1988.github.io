import { GerberParseError } from '../errors';

/**
 * Evaluates the arithmetic expressions that may appear in place of any aperture-macro parameter,
 * e.g. `$1x0.75` or `(1+$3)/2`. Gerber uses `x` (not `*`) for multiplication, because `*`
 * terminates a block.
 */
export function evaluateMacroExpression(
  expression: string,
  variables: ReadonlyMap<number, number>,
): number {
  const cursor = new Cursor(expression);
  const value = parseSum(cursor, variables);
  cursor.skipWhitespace();
  if (!cursor.atEnd)
    throw new GerberParseError(
      `Unexpected '${cursor.peek()}' in macro expression '${expression}'.`,
    );

  return value;
}

/** Stands in for C#'s `ref int position`. */
class Cursor {
  position = 0;

  constructor(readonly text: string) {}

  get atEnd(): boolean {
    return this.position >= this.text.length;
  }

  peek(): string {
    return this.text[this.position];
  }

  skipWhitespace(): void {
    while (!this.atEnd && /\s/.test(this.peek())) this.position++;
  }
}

function parseSum(cursor: Cursor, variables: ReadonlyMap<number, number>): number {
  let value = parseProduct(cursor, variables);
  for (;;) {
    cursor.skipWhitespace();
    if (cursor.atEnd) return value;

    const op = cursor.peek();
    if (op !== '+' && op !== '-') return value;

    cursor.position++;
    const rhs = parseProduct(cursor, variables);
    value = op === '+' ? value + rhs : value - rhs;
  }
}

function parseProduct(cursor: Cursor, variables: ReadonlyMap<number, number>): number {
  let value = parseUnary(cursor, variables);
  for (;;) {
    cursor.skipWhitespace();
    if (cursor.atEnd) return value;

    const op = cursor.peek();
    if (op !== 'x' && op !== 'X' && op !== '/') return value;

    cursor.position++;
    const rhs = parseUnary(cursor, variables);
    if (op === '/') {
      if (rhs === 0)
        throw new GerberParseError(`Division by zero in macro expression '${cursor.text}'.`);
      value /= rhs;
    } else {
      value *= rhs;
    }
  }
}

function parseUnary(cursor: Cursor, variables: ReadonlyMap<number, number>): number {
  cursor.skipWhitespace();
  if (!cursor.atEnd && (cursor.peek() === '+' || cursor.peek() === '-')) {
    const negate = cursor.peek() === '-';
    cursor.position++;
    const operand = parseUnary(cursor, variables);
    return negate ? -operand : operand;
  }

  return parsePrimary(cursor, variables);
}

function parsePrimary(cursor: Cursor, variables: ReadonlyMap<number, number>): number {
  cursor.skipWhitespace();
  if (cursor.atEnd)
    throw new GerberParseError(`Macro expression '${cursor.text}' ended unexpectedly.`);

  if (cursor.peek() === '(') {
    cursor.position++;
    const inner = parseSum(cursor, variables);
    cursor.skipWhitespace();
    if (cursor.atEnd || cursor.peek() !== ')')
      throw new GerberParseError(`Unbalanced parentheses in macro expression '${cursor.text}'.`);

    cursor.position++;
    return inner;
  }

  if (cursor.peek() === '$') {
    cursor.position++;
    const start = cursor.position;
    while (!cursor.atEnd && /[0-9]/.test(cursor.peek())) cursor.position++;

    if (start === cursor.position)
      throw new GerberParseError(`Macro variable without an index in '${cursor.text}'.`);

    const index = Number(cursor.text.slice(start, cursor.position));

    // The spec says undefined variables evaluate to zero rather than being an error.
    return variables.get(index) ?? 0;
  }

  const numberStart = cursor.position;
  while (!cursor.atEnd && (/[0-9]/.test(cursor.peek()) || cursor.peek() === '.'))
    cursor.position++;

  if (numberStart === cursor.position)
    throw new GerberParseError(
      `Expected a number at offset ${cursor.position} of macro expression '${cursor.text}'.`,
    );

  return Number(cursor.text.slice(numberStart, cursor.position));
}
