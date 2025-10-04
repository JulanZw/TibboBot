import { parse } from 'mathjs';

const allowedMathWords = [
  'sqrt',
  'sin',
  'cos',
  'tan',
  'log',
  'ln',
  'pi',
  'e',
  'abs',
  'mod',
  'round',
  'floor',
  'ceil',
];

export function looksLikeMathExpression(input: string): boolean {
  const hasMathThings =
    /\d/.test(input) ||
    allowedMathWords.some((word) => input.includes(word)) ||
    /[+\-*/^=()]/.test(input);

  if (!hasMathThings) return false;

  try {
    const node = parse(input);
    return !!node;
  } catch {
    return false;
  }
}
