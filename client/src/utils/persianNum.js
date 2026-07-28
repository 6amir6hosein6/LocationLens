/**
 * Fast single-pass conversion: Latin digits → Persian/Farsi digits.
 * Handles strings with mixed text/numbers (e.g. dates, prices, descriptions).
 */
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function fa(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[d]);
}

export function faNum(num) {
  return fa(num);
}

/**
 * Convert Persian/Arabic-Indic digits (as typed by mobile keyboards set to
 * Farsi/Arabic) back to Latin digits, e.g. for numeric inputs and validation.
 */
export function toEnglishDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[۰-۹٠-٩]/g, (d) => {
    const persianIdx = PERSIAN_DIGITS.indexOf(d);
    if (persianIdx !== -1) return String(persianIdx);
    return String(ARABIC_INDIC_DIGITS.indexOf(d));
  });
}

/**
 * Format a Persian date string from a timestamp or ISO string.
 * Keeps Gregorian calendar but shows digits in Persian.
 */
export function faDate(input) {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  const str = d.toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fa(str);
}

/**
 * Format a Persian date+time string.
 */
export function faDateTime(input) {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  const str = d.toLocaleString('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return fa(str);
}
