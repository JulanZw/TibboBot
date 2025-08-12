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
