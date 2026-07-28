// Iranian mobile numbers: optional +98 or leading 0, then 9 followed by 9 digits.
// Keep this in sync with the backend validator in server/app/schemas.py.
export const IRAN_PHONE_REGEX = /^(\+98|0)?9\d{9}$/;

export function isValidIranianPhone(phone) {
  return IRAN_PHONE_REGEX.test((phone || '').trim());
}
