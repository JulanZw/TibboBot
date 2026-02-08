/**
 * Preprocesses a numeric expression string to normalize localized number formats
 * and convert alternative mathematical notations into a form compatible with math.js.
 *
 * This function performs:
 * - Localization handling (Dutch and English styles):
 *   - Converts comma decimals (e.g., "5,5") to dot decimals ("5.5")
 *   - Removes thousand separators (e.g., "1.000,50" → "1000.50")
 * - Base conversion:
 *   - Converts binary (0b), octal (0o), and hexadecimal (0x) to decimal
 * - Symbol replacements:
 *   - Handles alternative multiplication (×, ✕), division (÷), minus (−, –, etc.), and plus (＋) signs
 * - Removes spaces in numbers (e.g., "1 000" → "1000")
 * - Converts full-width brackets and parentheses to ASCII equivalents
 * - Handles repeated operators (e.g., "--" becomes "+", "++" becomes "+")
 *
 * @param expr - The input expression string to preprocess (e.g., "0b101 + 5,4 + 1.000,25 × 2")
 * @returns The normalized and math.js-compatible string (e.g., "5 + 5.4 + 1000.25 * 2")
 */
export function preprocessNumerics(expr: string): string {
  // Normalize localized number formats (Dutch vs English)
  const normalized = expr.replace(/(\d[\d.,]*\d|\d)/g, (match) => {
    const hasDot = match.includes('.');
    const hasComma = match.includes(',');

    if (hasDot && hasComma) {
      // e.g., 1.000,50 (Dutch) or 1,000.50 (English)
      if (match.indexOf(',') > match.indexOf('.')) {
        // Dutch: dot as thousand, comma as decimal
        return match.replace(/\.(?=\d{3})/g, '').replace(',', '.');
      } else {
        // English: comma as thousand, dot as decimal
        return match.replace(/,(?=\d{3})/g, '');
      }
    } else if (hasComma) {
      const parts = match.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Likely Dutch decimal
        return match.replace(',', '.');
      } else {
        // English thousands comma
        return match.replace(/,(?=\d{3})/g, '');
      }
    } else if (hasDot) {
      const parts = match.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        // English decimal
        return match;
      } else {
        // Dot as thousands separator
        return match.replace(/\.(?=\d{3})/g, '');
      }
    }

    return match;
  });

  // Additional numeric and symbol normalization
  return (
    normalized
      // Binary, octal, hex
      .replace(/\b0([box])[0-9a-fA-F]+\b/g, (match) => {
        const prefix = match.slice(0, 2);
        let base: number;
        switch (prefix) {
          case '0b':
            base = 2;
            break;
          case '0o':
            base = 8;
            break;
          case '0x':
            base = 16;
            break;
          default:
            return match;
        }
        return parseInt(match.slice(2), base).toString();
      })
      .replace(/[×✕]/g, '*')
      .replace(/[÷]/g, '/')
      .replace(/[−﹣‒–—―]/g, '-')
      .replace(/[＋]/g, '+')
      // Spaces in numbers
      .replace(/(?<=\d)[\s\u00A0](?=\d)/g, '')
      .replace(/[（]/g, '(')
      .replace(/[）]/g, ')')
      .replace(/[［]/g, '[')
      .replace(/[］]/g, ']')
      .replace(/[｛]/g, '{')
      .replace(/[｝]/g, '}')
      .replace(/\+\++/g, '+')
      // Double minus becomes plus
      .replace(/--+/g, '+')
      .trim()
  );
}
