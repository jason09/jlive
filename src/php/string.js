/**
 * PHP-like string functions.
 * @module php/string
 */

import { assertArity, assertBoolean, assertNumber, assertString, typeError } from "../internal/assert.js";
import { htmlEntities } from "../internal/htmlEntities.js";

// --- helpers ---

/**
 * @param {string} str
 * @param {number} start
 * @param {number} [length]
 */
function _substrUtf16(str, start, length) {
  // PHP substr is bytes in some encodings; in JS we operate on UTF-16 code units.
  const s = start < 0 ? Math.max(str.length + start, 0) : start;
  if (length === undefined) return str.slice(s);
  const len = length < 0 ? Math.max(str.length - s + length, 0) : length;
  return str.slice(s, s + len);
}

/**
 * Escape a string for a JS regexp literal.
 * @param {string} s
 */
function _reEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Add backslashes before characters that need to be escaped.
 * @param {string} str
 * @returns {string}
 */
export function addslashes(str) {
  assertArity("addslashes", arguments, 1, 1);
  assertString("addslashes", 1, str);
  return str.replace(/[\\\"'\0]/g, (m) => (m === "\0" ? "\\0" : `\\${m}`));
}

/**
 * Un-quotes a quoted string.
 * @param {string} str
 * @returns {string}
 */
export function stripslashes(str) {
  assertArity("stripslashes", arguments, 1, 1);
  assertString("stripslashes", 1, str);
  return str.replace(/\\(.)/g, "$1");
}

/**
 * Get string length.
 * @param {string} str
 * @returns {number}
 */
export function strlen(str) {
  assertArity("strlen", arguments, 1, 1);
  assertString("strlen", 1, str);
  return str.length;
}

/**
 * Make a string's first character uppercase.
 * @param {string} str
 * @returns {string}
 */
export function ucfirst(str) {
  assertArity("ucfirst", arguments, 1, 1);
  assertString("ucfirst", 1, str);
  if (str.length === 0) return "";
  return str[0].toUpperCase() + str.slice(1);
}

/**
 * Make a string's first character lowercase.
 * @param {string} str
 * @returns {string}
 */
export function lcfirst(str) {
  assertArity("lcfirst", arguments, 1, 1);
  assertString("lcfirst", 1, str);
  if (str.length === 0) return "";
  return str[0].toLowerCase() + str.slice(1);
}

/**
 * Uppercase a string.
 * @param {string} str
 * @returns {string}
 */
export function strtoupper(str) {
  assertArity("strtoupper", arguments, 1, 1);
  assertString("strtoupper", 1, str);
  return str.toUpperCase();
}

/**
 * Lowercase a string.
 * @param {string} str
 * @returns {string}
 */
export function strtolower(str) {
  assertArity("strtolower", arguments, 1, 1);
  assertString("strtolower", 1, str);
  return str.toLowerCase();
}

/**
 * Uppercase the first character of each word.
 * @param {string} str
 * @returns {string}
 */
export function ucwords(str) {
  assertArity("ucwords", arguments, 1, 1);
  assertString("ucwords", 1, str);
  // Avoid Unicode property escapes for maximum runtime portability.
  // Covers ASCII + Latin-1 letters (good enough for most PHP ucwords usage).
  return str.replace(/(^|[\s\-_])([A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF])/g, (m, sep, ch) => `${sep}${ch.toUpperCase()}`);
}

/**
 * Split a string.
 * @param {string} separator
 * @param {string} str
 * @param {number} [limit]
 * @returns {string[]}
 */
export function explode(separator, str, limit) {
  assertArity("explode", arguments, 2, 3);
  assertString("explode", 1, separator);
  assertString("explode", 2, str);
  if (limit !== undefined && typeof limit !== "number") typeError("explode", 3, "int", limit);
  if (separator === "") return [str];
  const parts = str.split(separator);
  if (limit === undefined || limit === 0) return parts;
  if (limit > 0) {
    if (parts.length <= limit) return parts;
    return [...parts.slice(0, limit - 1), parts.slice(limit - 1).join(separator)];
  }
  // negative: remove last |limit| parts
  return parts.slice(0, Math.max(0, parts.length + limit));
}

/**
 * Join array elements with a string.
 * @param {string} glue
 * @param {any[]|Record<string, any>} pieces
 * @returns {string}
 * @see https://www.php.net/manual/en/function.implode.php
 */
export function implode(glue, pieces) {
  assertArity("implode", arguments, 2, 2);
  assertString("implode", 1, glue);
  if (Array.isArray(pieces)) return pieces.map((v) => String(v)).join(glue);
  if (pieces && typeof pieces === "object") return Object.values(pieces).map((v) => String(v)).join(glue);
  typeError("implode", 2, "array", pieces);
}

/**
 * Strip whitespace (or other characters) from the beginning and end of a string.
 * @param {string} str
 * @param {string} [characterMask]
 */
export function trim(str, characterMask) {
  assertArity("trim", arguments, 1, 2);
  assertString("trim", 1, str);
  if (characterMask === undefined) return str.trim();
  assertString("trim", 2, characterMask);
  const re = new RegExp(`^[${_reEscape(characterMask)}]+|[${_reEscape(characterMask)}]+$`, "g");
  return str.replace(re, "");
}

/**
 * Left trim.
 * @param {string} str
 * @param {string} [characterMask]
 */
export function ltrim(str, characterMask) {
  assertArity("ltrim", arguments, 1, 2);
  assertString("ltrim", 1, str);
  if (characterMask === undefined) return str.replace(/^\s+/u, "");
  assertString("ltrim", 2, characterMask);
  const re = new RegExp(`^[${_reEscape(characterMask)}]+`, "g");
  return str.replace(re, "");
}

/**
 * Right trim.
 * @param {string} str
 * @param {string} [characterMask]
 */
export function rtrim(str, characterMask) {
  assertArity("rtrim", arguments, 1, 2);
  assertString("rtrim", 1, str);
  if (characterMask === undefined) return str.replace(/\s+$/u, "");
  assertString("rtrim", 2, characterMask);
  const re = new RegExp(`[${_reEscape(characterMask)}]+$`, "g");
  return str.replace(re, "");
}

/**
 * Remove all whitespace in the string.
 * @param {string} str
 */
export function trimAll(str) {
  assertArity("trimAll", arguments, 1, 1);
  assertString("trimAll", 1, str);
  return str.replace(/\s+/gu, "").trim();
}

/**
 * Return ASCII value of first character.
 * @param {string} str
 * @returns {number}
 */
export function ord(str) {
  assertArity("ord", arguments, 1, 1);
  assertString("ord", 1, str);
  return str.length ? str.codePointAt(0) ?? 0 : 0;
}

/**
 * Generate a string from ASCII code.
 * @param {number} code
 * @returns {string}
 */
export function chr(code) {
  assertArity("chr", arguments, 1, 1);
  if (typeof code !== "number") typeError("chr", 1, "int", code);
  return String.fromCodePoint(code);
}

/**
 * Find the position of the first occurrence of a substring in a string.
 * @param {string} haystack
 * @param {string} needle
 * @param {number} [offset]
 * @returns {number|false}
 */
export function strpos(haystack, needle, offset = 0) {
  assertArity("strpos", arguments, 2, 3);
  assertString("strpos", 1, haystack);
  assertString("strpos", 2, needle);
  if (offset !== undefined && typeof offset !== "number") typeError("strpos", 3, "int", offset);
  const i = haystack.indexOf(needle, offset);
  return i === -1 ? false : i;
}

/**
 * Case-insensitive strpos.
 */
export function stripos(haystack, needle, offset = 0) {
  assertArity("stripos", arguments, 2, 3);
  assertString("stripos", 1, haystack);
  assertString("stripos", 2, needle);
  if (offset !== undefined && typeof offset !== "number") typeError("stripos", 3, "int", offset);
  const i = haystack.toLowerCase().indexOf(needle.toLowerCase(), offset);
  return i === -1 ? false : i;
}

/**
 * Find the position of the last occurrence of a substring.
 */
export function strrpos(haystack, needle, offset = 0) {
  assertArity("strrpos", arguments, 2, 3);
  assertString("strrpos", 1, haystack);
  assertString("strrpos", 2, needle);
  if (offset !== undefined && typeof offset !== "number") typeError("strrpos", 3, "int", offset);
  const i = haystack.lastIndexOf(needle, offset === 0 ? undefined : offset);
  return i === -1 ? false : i;
}

/**
 * Binary safe string comparison.
 */
export function strcmp(a, b) {
  assertArity("strcmp", arguments, 2, 2);
  assertString("strcmp", 1, a);
  assertString("strcmp", 2, b);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Case-insensitive string comparison.
 */
export function strcasecmp(a, b) {
  assertArity("strcasecmp", arguments, 2, 2);
  assertString("strcasecmp", 1, a);
  assertString("strcasecmp", 2, b);
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  if (A === B) return 0;
  return A < B ? -1 : 1;
}

/**
 * Replace all occurrences.
 * @param {string|string[]} search
 * @param {string|string[]} replace
 * @param {string|string[]} subject
 * @param {number} [count]
 */
export function str_replace(search, replace, subject, count) {
  assertArity("str_replace", arguments, 3, 4);
  const searches = Array.isArray(search) ? search.map(String) : [String(search)];
  const replaces = Array.isArray(replace) ? replace.map(String) : [String(replace)];
  const subjects = Array.isArray(subject) ? subject.map(String) : [String(subject)];

  let replacedCount = 0;
  const out = subjects.map((s) => {
    let r = s;
    searches.forEach((needle, i) => {
      const rep = replaces[i] ?? replaces[0] ?? "";
      if (needle === "") return;
      const pieces = r.split(needle);
      replacedCount += Math.max(0, pieces.length - 1);
      r = pieces.join(rep);
    });
    return r;
  });
  if (typeof count === "object" && count) count.value = replacedCount;
  return Array.isArray(subject) ? out : out[0];
}

/**
 * Case-insensitive str_replace.
 */
export function str_ireplace(search, replace, subject, count) {
  assertArity("str_ireplace", arguments, 3, 4);
  const subjects = Array.isArray(subject) ? subject.map(String) : [String(subject)];
  const searches = Array.isArray(search) ? search.map(String) : [String(search)];
  const replaces = Array.isArray(replace) ? replace.map(String) : [String(replace)];
  let replacedCount = 0;

  const out = subjects.map((s) => {
    let r = s;
    searches.forEach((needle, i) => {
      const rep = replaces[i] ?? replaces[0] ?? "";
      if (needle === "") return;
      const re = new RegExp(_reEscape(needle), "giu");
      r = r.replace(re, () => {
        replacedCount++;
        return rep;
      });
    });
    return r;
  });
  if (typeof count === "object" && count) count.value = replacedCount;
  return Array.isArray(subject) ? out : out[0];
}

/**
 * Get part of string.
 * @param {string} str
 * @param {number} start
 * @param {number} [length]
 */
export function substr(str, start, length) {
  assertArity("substr", arguments, 2, 3);
  assertString("substr", 1, str);
  if (typeof start !== "number") typeError("substr", 2, "int", start);
  if (length !== undefined && typeof length !== "number") typeError("substr", 3, "int", length);
  return _substrUtf16(str, start, length);
}

/**
 * Reverse a string.
 */
export function strrev(str) {
  assertArity("strrev", arguments, 1, 1);
  assertString("strrev", 1, str);
  // Use iterator to keep surrogate pairs together.
  return Array.from(str).reverse().join("");
}

/**
 * Repeat a string.
 */
export function str_repeat(str, times) {
  assertArity("str_repeat", arguments, 2, 2);
  assertString("str_repeat", 1, str);
  if (typeof times !== "number") typeError("str_repeat", 2, "int", times);
  if (times < 0) throw new RangeError("Warning: str_repeat() expects parameter 2 to be greater than or equal to 0");
  return str.repeat(times);
}

/**
 * Pad a string to a certain length.
 * @param {string} str
 * @param {number} padLength
 * @param {string} [padString=" "]
 * @param {"STR_PAD_RIGHT"|"STR_PAD_LEFT"|"STR_PAD_BOTH"} [padType="STR_PAD_RIGHT"]
 */
export function str_pad(str, padLength, padString = " ", padType = "STR_PAD_RIGHT") {
  assertArity("str_pad", arguments, 2, 4);
  assertString("str_pad", 1, str);
  if (typeof padLength !== "number") typeError("str_pad", 2, "int", padLength);
  assertString("str_pad", 3, padString);

  if (padString === "") throw new TypeError("Warning: str_pad() pad_string must not be empty");
  if (str.length >= padLength) return str;
  const needed = padLength - str.length;

  const makePad = (n) => padString.repeat(Math.ceil(n / padString.length)).slice(0, n);
  if (padType === "STR_PAD_LEFT") return makePad(needed) + str;
  if (padType === "STR_PAD_BOTH") {
    const left = Math.floor(needed / 2);
    const right = needed - left;
    return makePad(left) + str + makePad(right);
  }
  return str + makePad(needed);
}

/**
 * Replace HTML entities.
 * @param {string} str
 */
export function html_entity_decode(str) {
  assertArity("html_entity_decode", arguments, 1, 1);
  assertString("html_entity_decode", 1, str);
  return str.replace(/&(#x?[0-9A-Fa-f]+|[A-Za-z][A-Za-z0-9]+);/g, (m, ent) => {
    if (ent[0] === "#") {
      const isHex = ent[1].toLowerCase() === "x";
      const n = parseInt(ent.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(n)) return String.fromCodePoint(n);
      return m;
    }
    return htmlEntities[ent] ?? m;
  });
}

/**
 * Convert characters to HTML entities.
 * @param {string} str
 */
export function htmlentities(str) {
  assertArity("htmlentities", arguments, 1, 1);
  assertString("htmlentities", 1, str);
  return str.replace(/[&<>"'\u00A0]/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      case "\u00A0":
        return "&nbsp;";
      default:
        return ch;
    }
  });
}

/**
 * Convert special characters to HTML entities.
 */
export function htmlspecialchars(str) {
  return htmlentities(str);
}

/**
 * Strip HTML and PHP tags from a string.
 *
 * @param {string} str The input string.
 * @param {string|string[]|null} [allowed_tags=null] Tags that should not be stripped.
 *        PHP accepts either a string like "<p><a>" or an array of tag names.
 * @returns {string} The stripped string.
 *
 * @throws {TypeError} If arguments types are invalid.
 * @see https://www.php.net/manual/en/function.strip-tags.php
 */
export function strip_tags(str, allowed_tags = null) {
  if (typeof str !== "string") {
    throw new TypeError(`strip_tags(): Argument #1 ($str) must be of type string, ${typeof str} given`);
  }

  let allowedSet = null;

  if (allowed_tags == null) {
    allowedSet = null;
  } else if (typeof allowed_tags === "string") {
    // Normalize: "<p><a>" => ["p","a"]
    const names = allowed_tags
      .toLowerCase()
      .match(/<\s*([a-z0-9]+)\s*>/gi)?.map(t => t.replace(/[<> \t\r\n]/g, "")) ?? [];
    allowedSet = new Set(names);
  } else if (Array.isArray(allowed_tags)) {
    const names = allowed_tags.map(t => {
      if (typeof t !== "string") {
        throw new TypeError(`strip_tags(): Argument #2 ($allowed_tags) array must contain only strings`);
      }
      return t.trim().toLowerCase().replace(/^<|>$/g, "");
    }).filter(Boolean);
    allowedSet = new Set(names);
  } else {
    throw new TypeError(
      `strip_tags(): Argument #2 ($allowed_tags) must be of type ?(string|array), ${typeof allowed_tags} given`
    );
  }

  // Remove HTML comments and PHP/ASP tags blocks (PHP behavior)
  let out = str
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\?(?:php)?[\s\S]*?\?>/gi, "")
    .replace(/<%[\s\S]*?%>/g, "");

  // Remove tags, but keep allowed ones
  out = out.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (m, tag) => {
    const name = String(tag).toLowerCase();
    return allowedSet && allowedSet.has(name) ? m : "";
  });

  return out;
}


/**
 * Count the number of substring occurrences.
 */
export function substr_count(haystack, needle, offset = 0, length) {
  assertArity("substr_count", arguments, 2, 4);
  assertString("substr_count", 1, haystack);
  assertString("substr_count", 2, needle);
  if (typeof offset !== "number") typeError("substr_count", 3, "int", offset);
  if (length !== undefined && typeof length !== "number") typeError("substr_count", 4, "int", length);
  if (needle === "") return 0;
  const slice = length === undefined ? haystack.slice(offset) : haystack.slice(offset, offset + length);
  return slice.split(needle).length - 1;
}

/**
 * Split string into array.
 */
export function str_split(str, splitLength = 1) {
  assertArity("str_split", arguments, 1, 2);
  assertString("str_split", 1, str);
  if (typeof splitLength !== "number") typeError("str_split", 2, "int", splitLength);
  if (splitLength < 1) throw new RangeError("Warning: str_split() expects parameter 2 to be greater than 0");
  const out = [];
  for (let i = 0; i < str.length; i += splitLength) out.push(str.slice(i, i + splitLength));
  return out;
}

/**
 * Word-wrap a string.
 */
export function wordwrap(str, width = 75, breakStr = "\n", cut = false) {
  assertArity("wordwrap", arguments, 1, 4);
  assertString("wordwrap", 1, str);
  if (typeof width !== "number") typeError("wordwrap", 2, "int", width);
  assertString("wordwrap", 3, breakStr);
  assertBoolean("wordwrap", 4, cut);
  if (width < 1) return str;
  const re = cut ? new RegExp(`(.{1,${width}})`, "gu") : new RegExp(`(.{1,${width}})(\s+|$)`, "gu");
  return str.replace(re, `$1${breakStr}`).replace(new RegExp(`${_reEscape(breakStr)}$`), "");
}

/**
 * base64_encode.
 * @param {string} str
 */
export function base64_encode(str) {
  assertArity("base64_encode", arguments, 1, 1);
  assertString("base64_encode", 1, str);
  return Buffer.from(str, "utf8").toString("base64");
}

/**
 * base64_decode.
 * @param {string} str
 * @param {boolean} [strict=false]
 */
export function base64_decode(str, strict = false) {
  assertArity("base64_decode", arguments, 1, 2);
  assertString("base64_decode", 1, str);
  assertBoolean("base64_decode", 2, strict);
  try {
    const b = Buffer.from(str, "base64");
    if (strict) {
      const normalized = b.toString("base64").replace(/=+$/g, "");
      const inputNorm = str.replace(/\s+/g, "").replace(/=+$/g, "");
      if (normalized !== inputNorm) return false;
    }
    return b.toString("utf8");
  } catch {
    return false;
  }
}

/**
 * str_contains (PHP 8+).
 */
export function str_contains(haystack, needle) {
  assertArity("str_contains", arguments, 2, 2);
  assertString("str_contains", 1, haystack);
  assertString("str_contains", 2, needle);
  return haystack.includes(needle);
}

/**
 * str_starts_with (PHP 8+).
 */
export function str_starts_with(haystack, needle) {
  assertArity("str_starts_with", arguments, 2, 2);
  assertString("str_starts_with", 1, haystack);
  assertString("str_starts_with", 2, needle);
  return haystack.startsWith(needle);
}

/**
 * str_ends_with (PHP 8+).
 */
export function str_ends_with(haystack, needle) {
  assertArity("str_ends_with", arguments, 2, 2);
  assertString("str_ends_with", 1, haystack);
  assertString("str_ends_with", 2, needle);
  return haystack.endsWith(needle);
}

/**
 * nl2br.
 */
export function nl2br(str, isXhtml = true) {
  assertArity("nl2br", arguments, 1, 2);
  assertString("nl2br", 1, str);
  assertBoolean("nl2br", 2, isXhtml);
  const br = isXhtml ? "<br />\n" : "<br>\n";
  return str.replace(/\r\n|\n\r|\r|\n/g, br);
}

/**
 * ucfirst/ucwords already, now: strtr.
 * @param {string} str
 * @param {Record<string,string>|string} from
 * @param {string} [to]
 */
export function strtr(str, from, to) {
  assertArity("strtr", arguments, 2, 3);
  assertString("strtr", 1, str);
  if (typeof from === "string") {
    assertString("strtr", 2, from);
    if (to === undefined) typeError("strtr", 3, "string", to);
    assertString("strtr", 3, to);
    const map = new Map();
    for (let i = 0; i < from.length; i++) map.set(from[i], to[i] ?? "");
    return Array.from(str, (ch) => map.get(ch) ?? ch).join("");
  }
  if (from && typeof from === "object") {
    const entries = Object.entries(from).sort((a, b) => b[0].length - a[0].length);
    let out = str;
    for (const [k, v] of entries) out = out.split(k).join(String(v));
    return out;
  }
  typeError("strtr", 2, "array", from);
}

/**
 * strpos-like for last occurrence case-insensitive.
 */
export function strripos(haystack, needle, offset = 0) {
  assertArity("strripos", arguments, 2, 3);
  assertString("strripos", 1, haystack);
  assertString("strripos", 2, needle);
  if (offset !== undefined && typeof offset !== "number") typeError("strripos", 3, "int", offset);
  const i = haystack.toLowerCase().lastIndexOf(needle.toLowerCase(), offset === 0 ? undefined : offset);
  return i === -1 ? false : i;
}

/**
 * sprintf (minimal %s %d %f with width/precision).
 * @param {string} format
 * @param  {...any} args
 */
export function sprintf(format, ...args) {
  assertArity("sprintf", arguments, 1, Infinity);
  assertString("sprintf", 1, format);
  let i = 0;
  return format.replace(/%([0-9]+\$)?([-+0 ]*)?(\d+)?(\.\d+)?([sdf%])/g, (m, pos, flags, width, prec, type) => {
    if (type === "%") return "%";
    const arg = pos ? args[parseInt(pos, 10) - 1] : args[i++];
    let out;
    switch (type) {
      case "s":
        out = String(arg);
        if (prec) out = out.slice(0, parseInt(prec.slice(1), 10));
        break;
      case "d":
        out = String(Number.parseInt(arg, 10) || 0);
        break;
      case "f": {
        const p = prec ? parseInt(prec.slice(1), 10) : undefined;
        const num = Number(arg);
        out = Number.isFinite(num) ? (p === undefined ? String(num) : num.toFixed(p)) : "0";
        break;
      }
      default:
        out = m;
    }
    const w = width ? parseInt(width, 10) : 0;
    if (w > out.length) {
      const padChar = flags?.includes("0") ? "0" : " ";
      const pad = padChar.repeat(w - out.length);
      out = flags?.includes("-") ? out + pad : pad + out;
    }
    return out;
  });
}

/**
 * urlencode.
 */
export function urlencode(str) {
  assertArity("urlencode", arguments, 1, 1);
  assertString("urlencode", 1, str);
  return encodeURIComponent(str).replace(/%20/g, "+");
}

/**
 * urldecode.
 */
export function urldecode(str) {
  assertArity("urldecode", arguments, 1, 1);
  assertString("urldecode", 1, str);
  return decodeURIComponent(str.replace(/\+/g, "%20"));
}

/**
 * rawurlencode.
 */
export function rawurlencode(str) {
  assertArity("rawurlencode", arguments, 1, 1);
  assertString("rawurlencode", 1, str);
  return encodeURIComponent(str);
}

/**
 * rawurldecode.
 */
export function rawurldecode(str) {
  assertArity("rawurldecode", arguments, 1, 1);
  assertString("rawurldecode", 1, str);
  return decodeURIComponent(str);
}

// ---------------------------------------------------------------------------
// Legacy compatibility (from original jLive v0.0.2)
// ---------------------------------------------------------------------------

/**
 * Natural order string comparison.
 * (Best-effort implementation.)
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function strnatcmp(a, b) {
  assertArity("strnatcmp", arguments, 2, 2);
  assertString("strnatcmp", 1, a);
  assertString("strnatcmp", 2, b);
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "variant" });
}

/**
 * Natural order case-insensitive string comparison.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function strnatcasecmp(a, b) {
  assertArity("strnatcasecmp", arguments, 2, 2);
  assertString("strnatcasecmp", 1, a);
  assertString("strnatcasecmp", 2, b);
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "accent" });
}

/**
 * Split a string into smaller chunks.
 * @param {string} body
 * @param {number} [chunklen=76]
 * @param {string} [end="\r\n"]
 * @returns {string}
 */
export function chunk_split(body, chunklen = 76, end = "\r\n") {
  assertArity("chunk_split", arguments, 1, 3);
  assertString("chunk_split", 1, body);
  if (chunklen !== undefined && typeof chunklen !== "number") typeError("chunk_split", 2, "int", chunklen);
  if (end !== undefined) assertString("chunk_split", 3, end);
  if (chunklen <= 0) return body + end;
  let out = "";
  for (let i = 0; i < body.length; i += chunklen) out += body.slice(i, i + chunklen) + end;
  return out;
}

/**
 * count_chars() - simplified.
 * mode 0 returns counts for all byte values (0..255) present.
 * mode 1 returns an object of used byte values.
 * mode 3 returns a string of used chars.
 * @param {string} str
 * @param {number} [mode=0]
 * @returns {any}
 */
export function count_chars(str, mode = 0) {
  assertArity("count_chars", arguments, 1, 2);
  assertString("count_chars", 1, str);
  if (mode !== undefined && typeof mode !== "number") typeError("count_chars", 2, "int", mode);
  /** @type {number[]} */
  const counts = Array(256).fill(0);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i) & 0xff;
    counts[c]++;
  }
  if (mode === 0) return counts;
  if (mode === 1) {
    /** @type {Record<string, number>} */
    const out = {};
    for (let i = 0; i < 256; i++) if (counts[i]) out[i] = counts[i];
    return out;
  }
  if (mode === 3) {
    let out = "";
    for (let i = 0; i < 256; i++) if (counts[i]) out += String.fromCharCode(i);
    return out;
  }
  throw new RangeError("Warning: count_chars() unsupported mode");
}

/**
 * strspn().
 * @param {string} str
 * @param {string} mask
 * @param {number} [start=0]
 * @param {number} [length]
 * @returns {number}
 */
export function strspn(str, mask, start = 0, length) {
  assertArity("strspn", arguments, 2, 4);
  assertString("strspn", 1, str);
  assertString("strspn", 2, mask);
  if (start !== undefined && typeof start !== "number") typeError("strspn", 3, "int", start);
  if (length !== undefined && typeof length !== "number") typeError("strspn", 4, "int", length);
  const s = str.slice(start, length !== undefined ? start + length : undefined);
  const set = new Set(mask.split(""));
  let n = 0;
  for (const ch of s) {
    if (!set.has(ch)) break;
    n++;
  }
  return n;
}

/**
 * strcspn().
 * @param {string} str
 * @param {string} mask
 * @param {number} [start=0]
 * @param {number} [length]
 * @returns {number}
 */
export function strcspn(str, mask, start = 0, length) {
  assertArity("strcspn", arguments, 2, 4);
  assertString("strcspn", 1, str);
  assertString("strcspn", 2, mask);
  if (start !== undefined && typeof start !== "number") typeError("strcspn", 3, "int", start);
  if (length !== undefined && typeof length !== "number") typeError("strcspn", 4, "int", length);
  const s = str.slice(start, length !== undefined ? start + length : undefined);
  const set = new Set(mask.split(""));
  let n = 0;
  for (const ch of s) {
    if (set.has(ch)) break;
    n++;
  }
  return n;
}

/**
 * Find first occurrence of a character in a string.
 * @param {string} haystack
 * @param {string} charList
 * @returns {string|false}
 */
export function strpbrk(haystack, charList) {
  assertArity("strpbrk", arguments, 2, 2);
  assertString("strpbrk", 1, haystack);
  assertString("strpbrk", 2, charList);
  const set = new Set(charList.split(""));
  for (let i = 0; i < haystack.length; i++) {
    if (set.has(haystack[i])) return haystack.slice(i);
  }
  return false;
}

/**
 * Find the last occurrence of a character in a string.
 * @param {string} haystack
 * @param {string} needle
 * @returns {string|false}
 */
export function strrchr(haystack, needle) {
  assertArity("strrchr", arguments, 2, 2);
  assertString("strrchr", 1, haystack);
  assertString("strrchr", 2, needle);
  const ch = needle.length ? needle[0] : "";
  const idx = haystack.lastIndexOf(ch);
  return idx === -1 ? false : haystack.slice(idx);
}

/**
 * Alias of strpos but returning substring.
 * @param {string} haystack
 * @param {string} needle
 * @param {number} [beforeNeedle=0]
 * @returns {string|false}
 */
export function strstr(haystack, needle, beforeNeedle = 0) {
  assertArity("strstr", arguments, 2, 3);
  assertString("strstr", 1, haystack);
  assertString("strstr", 2, needle);
  if (beforeNeedle !== undefined && typeof beforeNeedle !== "number") typeError("strstr", 3, "int", beforeNeedle);
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;
  return beforeNeedle ? haystack.slice(0, idx) : haystack.slice(idx);
}

/**
 * Case-insensitive strstr.
 * @param {string} haystack
 * @param {string} needle
 * @param {number} [beforeNeedle=0]
 * @returns {string|false}
 */
export function stristr(haystack, needle, beforeNeedle = 0) {
  assertArity("stristr", arguments, 2, 3);
  assertString("stristr", 1, haystack);
  assertString("stristr", 2, needle);
  if (beforeNeedle !== undefined && typeof beforeNeedle !== "number") typeError("stristr", 3, "int", beforeNeedle);
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  const idx = h.indexOf(n);
  if (idx === -1) return false;
  return beforeNeedle ? haystack.slice(0, idx) : haystack.slice(idx);
}

/**
 * substr_replace().
 * @param {string} str
 * @param {string} replacement
 * @param {number} start
 * @param {number} [length]
 * @returns {string}
 */
export function substr_replace(str, replacement, start, length) {
  assertArity("substr_replace", arguments, 3, 4);
  assertString("substr_replace", 1, str);
  assertString("substr_replace", 2, replacement);
  if (typeof start !== "number") typeError("substr_replace", 3, "int", start);
  if (length !== undefined && typeof length !== "number") typeError("substr_replace", 4, "int", length);
  const realStart = start < 0 ? Math.max(str.length + start, 0) : start;
  const realEnd = length === undefined ? realStart : (length < 0 ? str.length + length : realStart + length);
  return str.slice(0, realStart) + replacement + str.slice(Math.max(realEnd, 0));
}

/**
 * substr_compare().
 * @param {string} mainStr
 * @param {string} str
 * @param {number} offset
 * @param {number} [length]
 * @param {boolean} [caseInsensitive=false]
 * @returns {number}
 */
export function substr_compare(mainStr, str, offset, length, caseInsensitive = false) {
  assertArity("substr_compare", arguments, 3, 5);
  assertString("substr_compare", 1, mainStr);
  assertString("substr_compare", 2, str);
  if (typeof offset !== "number") typeError("substr_compare", 3, "int", offset);
  if (length !== undefined && typeof length !== "number") typeError("substr_compare", 4, "int", length);
  if (caseInsensitive !== undefined && typeof caseInsensitive !== "boolean") typeError("substr_compare", 5, "bool", caseInsensitive);
  let a = mainStr.slice(offset, length !== undefined ? offset + length : undefined);
  let b = str.slice(0, length);
  if (caseInsensitive) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }
  return a.localeCompare(b);
}

/**
 * quotemeta().
 * @param {string} str
 * @returns {string}
 */
export function quotemeta(str) {
  assertArity("quotemeta", arguments, 1, 1);
  assertString("quotemeta", 1, str);
  return str.replace(/[.\\+*?\[\^\]$(){}=!<>|:-]/g, "\\$&");
}

/**
 * parse_str() - returns an object of parsed query parameters.
 * @param {string} encodedString
 * @param {Record<string, any>} [result]
 * @returns {Record<string, any>}
 */
export function parse_str(encodedString, result = {}) {
  assertArity("parse_str", arguments, 1, 2);
  assertString("parse_str", 1, encodedString);
  if (result !== undefined && (result === null || typeof result !== "object" || Array.isArray(result))) typeError("parse_str", 2, "array", result);
  const params = new URLSearchParams(encodedString.replace(/^\?/, ""));
  for (const [k, v] of params.entries()) {
    // mimic PHP: repeated keys become arrays
    if (Object.prototype.hasOwnProperty.call(result, k)) {
      const cur = result[k];
      if (Array.isArray(cur)) cur.push(v);
      else result[k] = [cur, v];
    } else {
      result[k] = v;
    }
  }
  return result;
}

// --- Extended parity: more PHP string functions ---

/**
 * PHP strncmp() — Binary safe string comparison of the first n characters.
 * @see https://www.php.net/manual/en/function.strncmp.php
 */
export function strncmp(str1, str2, length) {
  assertArity("strncmp", arguments, 3, 3);
  assertString("strncmp", 1, str1);
  assertString("strncmp", 2, str2);
  if (typeof length !== "number") typeError("strncmp", 3, "int", length);
  const n = Math.max(0, Math.trunc(length));
  const a = str1.slice(0, n);
  const b = str2.slice(0, n);
  return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * PHP strncasecmp() — Case-insensitive string comparison of the first n characters.
 * @see https://www.php.net/manual/en/function.strncasecmp.php
 */
export function strncasecmp(str1, str2, length) {
  assertArity("strncasecmp", arguments, 3, 3);
  assertString("strncasecmp", 1, str1);
  assertString("strncasecmp", 2, str2);
  if (typeof length !== "number") typeError("strncasecmp", 3, "int", length);
  return strncmp(str1.toLowerCase(), str2.toLowerCase(), length);
}

/**
 * PHP str_shuffle() — Randomly shuffles a string.
 * @see https://www.php.net/manual/en/function.str-shuffle.php
 */
export function str_shuffle(string) {
  assertArity("str_shuffle", arguments, 1, 1);
  assertString("str_shuffle", 1, string);
  const arr = Array.from(string);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

/**
 * PHP str_word_count() — Return information about words used in a string.
 * Note: simplified word detection (Latin letters + digits + underscore).
 * @see https://www.php.net/manual/en/function.str-word-count.php
 */
export function str_word_count(string, format = 0, charlist = "") {
  assertArity("str_word_count", arguments, 1, 3);
  assertString("str_word_count", 1, string);
  if (typeof format !== "number") typeError("str_word_count", 2, "int", format);
  if (typeof charlist !== "string") typeError("str_word_count", 3, "string", charlist);

  const extra = charlist.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`[A-Za-z0-9_${extra}]+`, "g");
  const matches = string.match(re) ?? [];
  if (format === 1) return matches;
  if (format === 2) {
    /** @type {Record<number, string>} */
    const out = {};
    for (const m of string.matchAll(re)) out[m.index ?? 0] = m[0];
    return out;
  }
  return matches.length;
}

/**
 * PHP levenshtein() — Calculate Levenshtein distance between two strings.
 * @see https://www.php.net/manual/en/function.levenshtein.php
 */
export function levenshtein(str1, str2, costIns = 1, costRep = 1, costDel = 1) {
  assertArity("levenshtein", arguments, 2, 5);
  assertString("levenshtein", 1, str1);
  assertString("levenshtein", 2, str2);
  if (typeof costIns !== "number") typeError("levenshtein", 3, "int", costIns);
  if (typeof costRep !== "number") typeError("levenshtein", 4, "int", costRep);
  if (typeof costDel !== "number") typeError("levenshtein", 5, "int", costDel);

  const a = Array.from(str1);
  const b = Array.from(str2);
  const m = a.length;
  const n = b.length;

  /** @type {number[]} */
  let prev = new Array(n + 1);
  /** @type {number[]} */
  let cur = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j * costIns;

  for (let i = 1; i <= m; i++) {
    cur[0] = i * costDel;
    for (let j = 1; j <= n; j++) {
      const del = prev[j] + costDel;
      const ins = cur[j - 1] + costIns;
      const rep = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : costRep);
      cur[j] = Math.min(del, ins, rep);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/**
 * PHP similar_text() — Calculate the similarity between two strings.
 * Note: simplified implementation returning percent if requested.
 * @see https://www.php.net/manual/en/function.similar-text.php
 */
export function similar_text(first, second, percent = undefined) {
  assertArity("similar_text", arguments, 2, 3);
  assertString("similar_text", 1, first);
  assertString("similar_text", 2, second);

  // Longest common subsequence length (O(m*n), ok for small strings)
  const a = Array.from(first);
  const b = Array.from(second);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const sim = dp[a.length][b.length];
  if (percent !== undefined) {
    // PHP sets percent by reference; in JS we return tuple-like
    const p = a.length + b.length === 0 ? 0 : (sim * 200) / (a.length + b.length);
    return { similarity: sim, percent: p };
  }
  return sim;
}

/**
 * PHP soundex() — Calculate the soundex key of a string.
 * @see https://www.php.net/manual/en/function.soundex.php
 */
export function soundex(string) {
  assertArity("soundex", arguments, 1, 1);
  assertString("soundex", 1, string);
  const s = string.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  const first = s[0];
  const map = {
    B: "1",
    F: "1",
    P: "1",
    V: "1",
    C: "2",
    G: "2",
    J: "2",
    K: "2",
    Q: "2",
    S: "2",
    X: "2",
    Z: "2",
    D: "3",
    T: "3",
    L: "4",
    M: "5",
    N: "5",
    R: "6",
  };
  let out = first;
  let prev = map[first] ?? "";
  for (let i = 1; i < s.length; i++) {
    const c = s[i];
    const code = map[c] ?? "";
    if (code && code !== prev) out += code;
    prev = code;
  }
  out = out.replace(/0/g, "");
  return (out + "000").slice(0, 4);
}

/**
 * PHP str_rot13() — Perform the rot13 transformation on a string.
 * @see https://www.php.net/manual/en/function.str-rot13.php
 */
export function str_rot13(string) {
  assertArity("str_rot13", arguments, 1, 1);
  assertString("str_rot13", 1, string);
  return string.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

/**
 * PHP hex2bin() — Decodes a hexadecimally encoded binary string.
 * @see https://www.php.net/manual/en/function.hex2bin.php
 */
export function hex2bin(string) {
  assertArity("hex2bin", arguments, 1, 1);
  assertString("hex2bin", 1, string);
  const s = string.length % 2 === 0 ? string : "0" + string;
  if (!/^[0-9a-fA-F]*$/.test(s)) return false;
  return Buffer.from(s, "hex").toString("utf8");
}


/**
 * PHP number_format() — Format a number with grouped thousands.
 * @see https://www.php.net/manual/en/function.number-format.php
 */
export function number_format(number, decimals = 0, decPoint = ".", thousandsSep = ",") {
  assertArity("number_format", arguments, 1, 4);
  if (typeof number !== "number") typeError("number_format", 1, "float", number);
  if (typeof decimals !== "number") typeError("number_format", 2, "int", decimals);
  if (typeof decPoint !== "string") typeError("number_format", 3, "string", decPoint);
  if (typeof thousandsSep !== "string") typeError("number_format", 4, "string", thousandsSep);

  const d = Math.max(0, Math.trunc(decimals));
  const fixed = number.toFixed(d);
  const [intPart, frac] = fixed.split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const int = sign ? intPart.slice(1) : intPart;
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
  return sign + grouped + (d ? decPoint + (frac ?? "") : "");
}


// -------------------------
// Additional PHP string funcs
// -------------------------

let __strtokStr = null;
let __strtokDelims = null;
let __strtokPos = 0;

/**
 * strtok — Tokenize string.
 * @see https://www.php.net/manual/en/function.strtok.php
 * @param {string} str
 * @param {string} token
 * @returns {string|false}
 */
export function strtok(str, token) {
  // PHP: strtok(string, token) starts; strtok(token) continues.
  if (arguments.length === 1) {
    token = str;
    if (__strtokStr === null) return false;
    str = __strtokStr;
  } else {
    assertString("strtok", 1, str);
    assertString("strtok", 2, token);
    __strtokStr = str;
    __strtokDelims = token;
    __strtokPos = 0;
  }

  assertArity("strtok", arguments, 1, 2);
  assertString("strtok", 1, token);

  const s = str;
  const delims = __strtokDelims ?? token;

  // Skip delimiters
  while (__strtokPos < s.length && delims.includes(s[__strtokPos])) __strtokPos++;
  if (__strtokPos >= s.length) return false;

  let start = __strtokPos;
  while (__strtokPos < s.length && !delims.includes(s[__strtokPos])) __strtokPos++;
  return s.slice(start, __strtokPos);
}

/**
 * str_getcsv — Parse a CSV string into an array.
 * @see https://www.php.net/manual/en/function.str-getcsv.php
 * @param {string} string
 * @param {string} [separator]
 * @param {string} [enclosure]
 * @param {string} [escape]
 * @returns {string[]}
 */
export function str_getcsv(string, separator = ",", enclosure = '"', escape = "\\") {
  assertArity("str_getcsv", arguments, 1, 4);
  assertString("str_getcsv", 1, string);
  assertString("str_getcsv", 2, separator);
  assertString("str_getcsv", 3, enclosure);
  assertString("str_getcsv", 4, escape);

  const out = [];
  let i = 0;
  let field = "";
  let inQuotes = false;

  while (i < string.length) {
    const ch = string[i];

    if (inQuotes) {
      if (ch === escape && i + 1 < string.length) {
        // take next char literally
        field += string[i + 1];
        i += 2;
        continue;
      }
      if (ch === enclosure) {
        // doubled enclosure -> literal
        if (i + 1 < string.length && string[i + 1] === enclosure) {
          field += enclosure;
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === enclosure) {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === separator) {
      out.push(field);
      field = "";
      i++;
      continue;
    }

    // handle \r\n, \n
    if (ch === "\n") {
      break;
    }
    if (ch === "\r") {
      if (i + 1 < string.length && string[i + 1] === "\n") i++;
      break;
    }

    field += ch;
    i++;
  }

  out.push(field);
  return out;
}

/**
 * pack — Pack data into binary string.
 * Limited subset: C c n v N V a A H h
 * @see https://www.php.net/manual/en/function.pack.php
 * @param {string} format
 * @param  {...any} values
 * @returns {string}
 */
export function pack(format, ...values) {
  assertArity("pack", arguments, 1, Infinity);
  assertString("pack", 1, format);

  const bytes = [];
  let vi = 0;

  const pushU8 = (n) => bytes.push(n & 0xff);
  const pushU16BE = (n) => (pushU8(n >>> 8), pushU8(n));
  const pushU16LE = (n) => (pushU8(n), pushU8(n >>> 8));
  const pushU32BE = (n) => (pushU8(n >>> 24), pushU8(n >>> 16), pushU8(n >>> 8), pushU8(n));
  const pushU32LE = (n) => (pushU8(n), pushU8(n >>> 8), pushU8(n >>> 16), pushU8(n >>> 24));

  const readCount = (j) => {
    let num = "";
    while (j < format.length && /[0-9]/.test(format[j])) num += format[j++];
    return { count: num === "" ? 1 : Number(num), next: j };
  };

  for (let i = 0; i < format.length; i++) {
    const code = format[i];
    if (code === " " || code === "\n" || code === "\t") continue;

    const { count, next } = readCount(i + 1);
    i = next - 1;

    const need = (n = 1) => {
      if (vi + n > values.length) throw new TypeError(`pack(): not enough arguments for format '${code}'`);
    };

    if ("CcnvNV".includes(code)) {
      for (let k = 0; k < count; k++) {
        need(1);
        const v = Number(values[vi++]);
        if (!Number.isFinite(v)) throw new TypeError("pack(): expected number");
        const n = v >>> 0;
        if (code === "c") pushU8((v & 0xff));
        else if (code === "C") pushU8(n);
        else if (code === "n") pushU16BE(n);
        else if (code === "v") pushU16LE(n);
        else if (code === "N") pushU32BE(n);
        else if (code === "V") pushU32LE(n);
      }
      continue;
    }

    if (code === "a" || code === "A") {
      need(1);
      const s = String(values[vi++]);
      const str = s.slice(0, count);
      for (let k = 0; k < count; k++) {
        const ch = k < str.length ? str.charCodeAt(k) : (code === "A" ? 0x20 : 0x00);
        pushU8(ch);
      }
      continue;
    }

    if (code === "H" || code === "h") {
      need(1);
      const hex = String(values[vi++]).replace(/\s+/g, "");
      const take = count === 1 ? hex.length : Math.min(hex.length, count);
      const h = hex.slice(0, take);
      for (let k = 0; k < h.length; k += 2) {
        const a = h[k] ?? "0";
        const b = h[k + 1] ?? "0";
        const byte = parseInt((code === "H" ? a + b : b + a), 16);
        if (!Number.isFinite(byte)) throw new TypeError("pack(): invalid hex string");
        pushU8(byte);
      }
      continue;
    }

    throw new TypeError(`pack(): unsupported format code '${code}'`);
  }

  return String.fromCharCode(...bytes);
}

/**
 * unpack — Unpack binary string into an associative array.
 * Limited subset matching pack() above.
 * @see https://www.php.net/manual/en/function.unpack.php
 * @param {string} format
 * @param {string} data
 * @param {number} [offset]
 * @returns {Record<string, any>|false}
 */
export function unpack(format, data, offset = 0) {
  assertArity("unpack", arguments, 2, 3);
  assertString("unpack", 1, format);
  assertString("unpack", 2, data);
  assertNumber("unpack", 3, offset);

  const buf = Uint8Array.from(data.slice(offset).split("").map((c) => c.charCodeAt(0) & 0xff));
  let bi = 0;
  const out = {};

  const readCount = (j) => {
    let num = "";
    while (j < format.length && /[0-9]/.test(format[j])) num += format[j++];
    return { count: num === "" ? 1 : Number(num), next: j };
  };

  const readName = (j) => {
    let name = "";
    while (j < format.length && format[j] !== "/" ) name += format[j++];
    return { name: name || "1", next: j };
  };

  const need = (n) => {
    if (bi + n > buf.length) return false;
    return true;
  };

  const u8 = () => buf[bi++];
  const u16be = () => (u8() << 8) | u8();
  const u16le = () => u8() | (u8() << 8);
  const u32be = () => ((u8() << 24) >>> 0) + (u8() << 16) + (u8() << 8) + u8();
  const u32le = () => (u8() + (u8() << 8) + (u8() << 16) + ((u8() << 24) >>> 0)) >>> 0;

  let fieldIndex = 1;

  for (let i = 0; i < format.length; i++) {
    const code = format[i];
    if (code === " " || code === "\n" || code === "\t") continue;

    const { count, next } = readCount(i + 1);
    i = next - 1;

    // name is everything until '/' or end
    let j = i + 1;
    let name = "";
    while (j < format.length && format[j] !== "/" && !/[A-Za-z]/.test(format[j])) j++;
    const nameRes = readName(j);
    name = nameRes.name;
    i = nameRes.next - 1;
    if (format[i + 1] === "/") i++;

    const set = (k, v) => (out[k] = v);

    if ("CcnvNV".includes(code)) {
      for (let k = 0; k < count; k++) {
        const key = count === 1 ? name : `${name}${k + 1}`;
        if (code === "C" || code === "c") {
          if (!need(1)) return false;
          const v = u8();
          set(key, code === "c" ? (v & 0x80 ? v - 256 : v) : v);
        } else if (code === "n") {
          if (!need(2)) return false;
          set(key, u16be());
        } else if (code === "v") {
          if (!need(2)) return false;
          set(key, u16le());
        } else if (code === "N") {
          if (!need(4)) return false;
          set(key, u32be());
        } else if (code === "V") {
          if (!need(4)) return false;
          set(key, u32le());
        }
      }
      continue;
    }

    if (code === "a" || code === "A") {
      if (!need(count)) return false;
      const slice = buf.slice(bi, bi + count);
      bi += count;
      let s = String.fromCharCode(...slice);
      if (code === "A") s = s.replace(/\s+$/g, "");
      else s = s.replace(/\x00+$/g, "");
      set(name, s);
      continue;
    }

    if (code === "H" || code === "h") {
      if (!need(Math.ceil(count / 2))) return false;
      const nbytes = Math.ceil(count / 2);
      const slice = buf.slice(bi, bi + nbytes);
      bi += nbytes;
      let hex = "";
      for (const b of slice) hex += b.toString(16).padStart(2, "0");
      set(name, hex.slice(0, count === 1 ? hex.length : count));
      continue;
    }

    throw new TypeError(`unpack(): unsupported format code '${code}'`);
  }

  return out;
}


// ---------------------------------------------------------------------------
// Additional PHP string parity (cslashes + printf family + htmlspecialchars_decode)
// ---------------------------------------------------------------------------

/**
 * addcslashes — Quote string with slashes in a C style.
 * Supports ranges like "\0..\37" and characters listed in charlist.
 * This is a pragmatic subset of PHP behavior.
 * @see https://www.php.net/manual/en/function.addcslashes.php
 * @param {string} str
 * @param {string} charlist
 * @returns {string}
 */
export function addcslashes(str, charlist) {
  assertArity("addcslashes", arguments, 2, 2);
  assertString("addcslashes", 1, str);
  assertString("addcslashes", 2, charlist);

  // Parse ranges like \0..\37 or A..Z
  const ranges = [];
  for (let i = 0; i < charlist.length; i++) {
    const ch = charlist[i];
    const next2 = charlist.slice(i + 1, i + 3);
    if (next2 === ".." && i + 3 < charlist.length) {
      const start = ch;
      const end = charlist[i + 3];
      ranges.push([start.codePointAt(0) ?? 0, end.codePointAt(0) ?? 0]);
      i += 3;
      continue;
    }
    ranges.push([ch.codePointAt(0) ?? 0, ch.codePointAt(0) ?? 0]);
  }

  const shouldEscape = (cp) => ranges.some(([a, b]) => cp >= Math.min(a, b) && cp <= Math.max(a, b));

  let out = "";
  for (const c of str) {
    const cp = c.codePointAt(0) ?? 0;
    if (!shouldEscape(cp)) { out += c; continue; }
    // C-style escapes
    if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === "\t") out += "\\t";
    else if (c === "\v") out += "\\v";
    else if (c === "\f") out += "\\f";
    else if (c === "\0") out += "\\0";
    else if (c === "\\") out += "\\\\";
    else if (cp < 32 || cp > 126) out += "\\" + cp.toString(8).padStart(3, "0");
    else out += "\\" + c;
  }
  return out;
}

/**
 * stripcslashes — Un-quote string quoted with addcslashes.
 * Pragmatic subset of PHP behavior.
 * @see https://www.php.net/manual/en/function.stripcslashes.php
 * @param {string} str
 * @returns {string}
 */
export function stripcslashes(str) {
  assertArity("stripcslashes", arguments, 1, 1);
  assertString("stripcslashes", 1, str);

  return str.replace(/\\(\\|[abfnrtv]|[0-7]{1,3}|x[0-9A-Fa-f]{1,2})/g, (_, esc) => {
    if (esc === "\\") return "\\";
    switch (esc) {
      case "a": return "\x07";
      case "b": return "\b";
      case "f": return "\f";
      case "n": return "\n";
      case "r": return "\r";
      case "t": return "\t";
      case "v": return "\v";
      default:
        if (/^[0-7]{1,3}$/.test(esc)) return String.fromCharCode(parseInt(esc, 8));
        if (/^x[0-9A-Fa-f]{1,2}$/.test(esc)) return String.fromCharCode(parseInt(esc.slice(1), 16));
        return esc;
    }
  });
}

/**
 * htmlspecialchars_decode — Convert special HTML entities back to characters.
 * @see https://www.php.net/manual/en/function.htmlspecialchars-decode.php
 * @param {string} string
 * @param {number} [flags]
 * @returns {string}
 */
export function htmlspecialchars_decode(string, flags = 0) {
  assertArity("htmlspecialchars_decode", arguments, 1, 2);
  assertString("htmlspecialchars_decode", 1, string);
  if (typeof flags !== "number") typeError("htmlspecialchars_decode", 2, "int", flags);

  // decode the 4 main specials like PHP default: &amp; &quot; &#039; &lt; &gt;
  return string
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * vsprintf — Return a formatted string (sprintf) using an array of arguments.
 * @see https://www.php.net/manual/en/function.vsprintf.php
 * @param {string} format
 * @param {any[]|Record<string, any>} args
 * @returns {string}
 */
export function vsprintf(format, args) {
  assertArity("vsprintf", arguments, 2, 2);
  assertString("vsprintf", 1, format);
  if (!args || (typeof args !== "object")) typeError("vsprintf", 2, "array", args);
  const values = Array.isArray(args) ? args : Object.values(args);
  return sprintf(format, ...values);
}

/**
 * printf — Output a formatted string.
 * In Node, we return the formatted string and optionally write to stdout.
 * @see https://www.php.net/manual/en/function.printf.php
 * @param {string} format
 * @param  {...any} args
 * @returns {number} Number of bytes written (utf8)
 */
export function printf(format, ...args) {
  assertArity("printf", arguments, 1, Infinity);
  const out = sprintf(format, ...args);
  // keep side effects minimal: write if stdout exists
  try { process?.stdout?.write?.(out); } catch {}
  return Buffer.byteLength(out, "utf8");
}

/**
 * vprintf — Output a formatted string using an array of arguments.
 * @see https://www.php.net/manual/en/function.vprintf.php
 * @param {string} format
 * @param {any[]|Record<string, any>} args
 * @returns {number}
 */
export function vprintf(format, args) {
  assertArity("vprintf", arguments, 2, 2);
  const out = vsprintf(format, args);
  try { process?.stdout?.write?.(out); } catch {}
  return Buffer.byteLength(out, "utf8");
}
