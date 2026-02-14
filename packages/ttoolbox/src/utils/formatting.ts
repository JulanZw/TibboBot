/**
 * Util function for formatting a `Date` like 2000-01-01 into January 1st
 *
 * @param date - the date that needs formatting
 * @returns the formatted date
 */
export function formatDateToString(date: Date) {
  const daySuffix = getDaySuffix(date.getDate());
  return (
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
    daySuffix
  );
}

/**
 * Util function to get the suffix of a number, e.g. 1st, 2nd, 3rd, 4th, etc.
 *
 * @param number - the number you want the suffix of
 * @returns the suffix of the number
 */
export function getDaySuffix(number: number) {
  if (number > 3 && number < 21) return 'th';
  switch (number % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Util function to format a date into a string with the DD-MM-YYYY format
 *
 * @param date - The date to format
 * @returns A formatted string in the format DD-MM-YYYY
 */
export function formatDateToDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Util function to format a date into a string with the YYYY-MM-DD HH:MM:SS format
 * @param date - The date to format
 * @returns A formatted string in YYYY-MM-DD HH:MM:SS format
 */
export function formatDateToYYYYMMDDHHMMSS(date: Date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Util function to format the first letter of a string
 * @param str - input string
 * @returns The formatted string
 */
export function capitalizeFirst(input: string): string {
  if (!input) return '';
  const lower = input.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Formats a duration in milliseconds into a human-readable string.
 * Examples:
 *  - 4200 -> "4s"
 *  - 65000 -> "1m 5s"
 *  - 3723000 -> "1h 2m 3s"
 *
 * @param ms Duration in milliseconds
 * @returns A formatted string
 */
export function formatDuration(ms: number): string {
  let seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}
