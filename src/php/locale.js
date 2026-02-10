/**
 * Locale-aware functions.
 *
 * JS uses Intl.Collator for locale-aware comparisons.
 * We provide a minimal setlocale/strcoll parity.
 *
 * @module php/locale
 */

import { assertArity, assertString, typeError } from "../internal/assert.js";

let currentLocale = "en-US";

/** PHP locale categories (subset) */
export const LC_ALL = 0;

/**
 * setlocale — Set locale information.
 * @see https://www.php.net/manual/en/function.setlocale.php
 * @param {number} category
 * @param {...string} locales
 * @returns {string|false}
 */
export function setlocale(category, ...locales) {
  assertArity("setlocale", arguments, 2, Infinity);
  if (typeof category !== "number") typeError("setlocale", 1, "int", category);
  for (let i = 0; i < locales.length; i++) assertString("setlocale", 2 + i, locales[i]);

  // Pick first locale supported; if none, false.
  for (const loc of locales) {
    try {
      // throws if invalid
      new Intl.Collator(loc);
      currentLocale = loc;
      return currentLocale;
    } catch {
      // continue
    }
  }
  return false;
}

/**
 * strcoll — Locale based string comparison.
 * @see https://www.php.net/manual/en/function.strcoll.php
 * @param {string} string1
 * @param {string} string2
 * @returns {number}
 */
export function strcoll(string1, string2) {
  assertArity("strcoll", arguments, 2, 2);
  assertString("strcoll", 1, string1);
  assertString("strcoll", 2, string2);

  const coll = new Intl.Collator(currentLocale);
  const r = coll.compare(string1, string2);
  return r < 0 ? -1 : r > 0 ? 1 : 0;
}

/**
 * strcasecmp_locale — Case-insensitive locale-aware compare (non-PHP helper).
 * @param {string} string1
 * @param {string} string2
 * @param {string} [locale]
 * @returns {number}
 */
export function strcasecmp_locale(string1, string2, locale = currentLocale) {
  assertArity("strcasecmp_locale", arguments, 2, 3);
  assertString("strcasecmp_locale", 1, string1);
  assertString("strcasecmp_locale", 2, string2);
  assertString("strcasecmp_locale", 3, locale);

  const coll = new Intl.Collator(locale, { sensitivity: "accent" });
  const r = coll.compare(string1, string2);
  return r < 0 ? -1 : r > 0 ? 1 : 0;
}

/** @returns {string} */
export function _get_current_locale() {
  return currentLocale;
}
