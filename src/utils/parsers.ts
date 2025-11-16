// #region Date parser

/**
 * Parses a `string` input into a `Date` object, supporting multiple date and duration formats.
 *
 * ### Supported input formats include:
 * #### Absolute dates:
 *   - ISO format: YYYY-MM-DD (e.g., "2025-07-24")
 *   - European format: DD-MM-YYYY (e.g., "24-07-2025")
 *   - Unix timestamp in seconds (e.g., "1234567890")
 *   - Unix timestamp in milliseconds (e.g., "1234567890000")
 *   - Discord timestamp format (e.g., "<t:1234567890>" or "<t:1234567890:f>")
 * #### Natural language keywords (English and Dutch):
 *   - "tomorrow", "the day after tomorrow"
 *   - "morgen", "overmorgen"
 *   - "next week", "volgende week", "over een week"
 *   - "next month", "volgende maand", "over een maand"
 * #### Weekday references (English and Dutch), optionally preceded by "next" or "volgende", e.g.:
 *   - "next monday", "volgende dinsdag", "volgende week vrijdag"
 * #### Relative durations specified with "in" or "over" (English/Dutch), supporting combinations of:
 *   - minutes ("minutes", "minuten", "min", "minuut")
 *   - hours ("hours", "uren", "u", "uur")
 *   - days ("days", "dagen", "dag")
 *   - weeks ("weeks", "weken")
 *   - months ("months", "maanden", "maand")
 *   - Supports fractional values for months (e.g., "in 1.5 months")
 *   - Multiple units can be combined in any order, but no duplicate units allowed
 *
 * ### Examples of valid inputs:
 * - "2025-07-24"
 * - "24-07-2025"
 * - "1234567890" (Unix timestamp in seconds)
 * - "1234567890000" (Unix timestamp in milliseconds)
 * - "<t:1234567890>" (Discord timestamp)
 * - "<t:1734567890:F>" (Discord timestamp with format)
 * - "tomorrow"
 * - "overmorgen"
 * - "next monday"
 * - "volgende week vrijdag"
 * - "in 5 minutes"
 * - "in 2 days and 3 hours"
 * - "over 1 maand en 15 dagen"
 * - "in 1.5 months"
 *
 * @param {string} input - The input string to parse
 * @returns {Date | null} The parsed `Date` object if valid, or `null` if input is invalid or not recognized
 */
export function parseDurationOrDateString(input: string): Date | null {
  input = input.trim().toLowerCase();
  let returnDate: Date | null = null;

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const altMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const unixMatch = input.match(/^\d+$/);
  const discordMatch = input.match(/^<t:(\d+)(?::[tTdDfFR])?>$/);

  // Unix timestamp (seconds or milliseconds)
  if (unixMatch) returnDate = parseUnixTimestamp(input);

  // Discord timestamp format
  if (discordMatch) returnDate = parseUnixTimestamp(discordMatch[1]);

  // YYYY-MM-DD
  if (isoMatch) returnDate = parseAbsoluteIsoDate(isoMatch);

  // DD-MM-YYYY
  if (altMatch) returnDate = parseAbsoluteAltDate(altMatch);

  // Natural keywords - (EN + NL)
  if (keywordMap[input]) return keywordMap[input]();

  // Weekdays - (EN + NL)
  const weekdayMatch = input.match(
    /^(next|volgende(?:\s+week)?)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)$/i,
  );
  if (weekdayMatch) {
    returnDate = parseWeekDay(weekdayMatch);
  }

  // Relative duration time
  const durationMatch = input.match(
    /((?:\d+(?:\.\d+)?\s*(?:min(?:uut)?(?:en)?|u(?:ren)?|hours?|dagen?|days?|weken?|weeks?|maanden?|months?)\s*(?:en|and)?\s*)+)/i,
  );
  if (durationMatch) {
    returnDate = parseRelativeTime(durationMatch);
  }

  if (returnDate) {
    returnDate.setSeconds(0);
    returnDate.setMilliseconds(0);
  }

  return returnDate;
}

function parseWeekDay(match: RegExpMatchArray): Date | null {
  const targetDayStr = match[2];
  const targetDay = weekdayMap[targetDayStr];
  if (targetDay === undefined) return null;

  const now = new Date();
  const currentDay = now.getDay();
  let daysToAdd = (targetDay + 7 - currentDay) % 7;
  // always go to next, not today
  if (daysToAdd === 0) daysToAdd = 7;

  return addDays(daysToAdd);
}

function parseRelativeTime(match: RegExpMatchArray): Date | null {
  if (!match[1]) return null;
  const result = new Date();
  const seen = new Set<string>();

  const components = [
    ...match[1].matchAll(
      /(\d+(?:\.\d+)?)\s*(days?|dagen|hours?|uren|u|minutes?|minuten|min|weeks?|weken|months?|maanden?|maand|uur|minuut)/gi,
    ),
  ];

  if (components.length === 0) return null;

  let totalWholeMonths = 0;
  let extraDaysFromFractionalMonths = 0;
  let totalMs = 0;

  for (const [, numStr, rawUnit] of components) {
    const unit = rawUnit.toLowerCase();
    const value = parseFloat(numStr);
    if (isNaN(value)) return null;

    let normalized: 'minute' | 'hour' | 'day' | 'week' | 'month' | null = null;

    if (['minute', 'minutes', 'minuten', 'min', 'minuut'].includes(unit))
      normalized = 'minute';
    else if (['hour', 'hours', 'uren', 'u', 'uur'].includes(unit))
      normalized = 'hour';
    else if (['day', 'days', 'dagen', 'dag'].includes(unit)) normalized = 'day';
    else if (['week', 'weeks', 'weken'].includes(unit)) normalized = 'week';
    else if (['month', 'months', 'maanden', 'maand'].includes(unit))
      normalized = 'month';

    if (!normalized || seen.has(normalized)) return null;
    seen.add(normalized);

    switch (normalized) {
      case 'minute':
        totalMs += value * 60 * 1000;
        break;
      case 'hour':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'day':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'week':
        totalMs += value * 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month': {
        const wholeMonths = Math.floor(value);
        const fractional = value - wholeMonths;

        totalWholeMonths += wholeMonths;

        if (fractional > 0) {
          const tempDate = new Date(result);
          tempDate.setMonth(tempDate.getMonth() + totalWholeMonths);

          const daysInThatMonth = new Date(
            tempDate.getFullYear(),
            tempDate.getMonth() + 1,
            0,
          ).getDate();
          extraDaysFromFractionalMonths += fractional * daysInThatMonth;
        }
        break;
      }
    }
  }

  result.setTime(result.getTime() + totalMs);

  if (totalWholeMonths > 0) {
    result.setMonth(result.getMonth() + totalWholeMonths);
  }

  if (extraDaysFromFractionalMonths > 0) {
    result.setDate(result.getDate() + extraDaysFromFractionalMonths);
  }

  return result;
}

// Small functions and consts for 'parseDurationOrDateString()'
const weekdayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  zondag: 0,
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
};

const keywordMap: Record<string, () => Date> = {
  tomorrow: () => addDays(1),
  morgen: () => addDays(1),
  'the day after tomorrow': () => addDays(2),
  overmorgen: () => addDays(2),
  'next week': () => addDays(7),
  'volgende week': () => addDays(7),
  'over een week': () => addDays(7),
  'next month': () => addMonths(1),
  'volgende maand': () => addMonths(1),
  'over een maand': () => addMonths(1),
};

export function addDays(days: number, originalDate?: Date): Date {
  const result = originalDate ?? new Date();
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(months: number, originalDate?: Date): Date {
  const result = originalDate ?? new Date();
  result.setMonth(result.getMonth() + months);
  return result;
}

export function parseAbsoluteIsoDate(match: RegExpMatchArray): Date | null {
  const [, y, m, d] = match;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

export function parseAbsoluteAltDate(match: RegExpMatchArray): Date | null {
  const [, d, m, y] = match;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

export function parseUnixTimestamp(input: string): Date | null {
  const timestamp = parseInt(input, 10);
  if (isNaN(timestamp)) return null;

  // Determine if its in seconds or milliseconds
  // Timestamps in seconds are typically 10 digits
  // Timestamps in milliseconds are typically 13 digits
  const isSeconds = input.length <= 10;
  const ms = isSeconds ? timestamp * 1000 : timestamp;

  const date = new Date(ms);

  // Validate the date is reasonable (between 1970 and 2100)
  if (date.getFullYear() < 1970 || date.getFullYear() > 2100) return null;

  return date;
}

// #endregion

// #region Birthday parser

export function parseBirthdayDate(input: string): Date | null {
  let returnDate: Date | null = null;

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const altMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  // YYYY-MM-DD
  if (isoMatch) returnDate = parseAbsoluteIsoDate(isoMatch);

  // DD-MM-YYYY
  if (altMatch) returnDate = parseAbsoluteAltDate(altMatch);

  if (returnDate) {
    returnDate.setSeconds(0);
    returnDate.setMilliseconds(0);
  }

  return returnDate;
}

// #endregion
