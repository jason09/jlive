/**
 * PHP-compatible PCRE-like functions (best-effort) for JavaScript RegExp.
 *
 * Features:
 * - Delimiter parsing: "/foo/i", "#foo#im", "~foo~u", etc.
 * - Modifiers: i m s u x A U D S J (A/U/D/S/J are compatibility no-ops where JS can't match PCRE semantics)
 * - Flags: PREG_OFFSET_CAPTURE, PREG_UNMATCHED_AS_NULL, PREG_SET_ORDER
 * - preg_last_error() and preg_last_error_msg()
 *
 * IMPORTANT:
 * JavaScript does not expose per-capture offsets. When PREG_OFFSET_CAPTURE is used,
 * offsets are best-effort approximations.
 *
 * @module php/preg
 */

import { assertArity, assertNumber, assertString, typeError } from "../internal/assert.js";

export const PREG_PATTERN_ORDER = 1;
export const PREG_SET_ORDER = 2;

export const PREG_OFFSET_CAPTURE = 256;
export const PREG_UNMATCHED_AS_NULL = 512;

export const PREG_NO_ERROR = 0;
export const PREG_INTERNAL_ERROR = 1;
export const PREG_BACKTRACK_LIMIT_ERROR = 2;
export const PREG_RECURSION_LIMIT_ERROR = 3;
export const PREG_BAD_UTF8_ERROR = 4;
export const PREG_BAD_UTF8_OFFSET_ERROR = 5;
export const PREG_JIT_STACKLIMIT_ERROR = 6;

let __pregLastError = PREG_NO_ERROR;
let __pregLastErrorMsg = "PREG_NO_ERROR";

function setPregError(code, msg) {
  __pregLastError = code;
  __pregLastErrorMsg = msg;
}

function stripExtended(pattern) {
  // PCRE x modifier: ignore whitespace and allow # comments (outside char classes)
  let out = "";
  let inClass = false;
  let escaped = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === "[" && !inClass) {
      inClass = true;
      out += ch;
      continue;
    }
    if (ch === "]" && inClass) {
      inClass = false;
      out += ch;
      continue;
    }
    if (!inClass && ch === "#") {
      // skip to end of line
      while (i < pattern.length && pattern[i] !== "\n") i++;
      continue;
    }
    if (!inClass && /\s/.test(ch)) continue;
    out += ch;
  }
  return out;
}

function parsePattern(pat) {
  // Returns {source, flags, modifiersRaw} or throws.
  if (pat.length < 2) throw new Error("Empty regex");
  const delim = pat[0];
  const last = pat.lastIndexOf(delim);
  if (last <= 0) throw new Error("Invalid delimiter");
  const body = pat.slice(1, last);
  const mods = pat.slice(last + 1);

  let flags = "g"; // we manage single vs all, but keep g for iter; we can drop for single match by cloning
  let extended = false;

  for (const m of mods) {
    if (m === "i") flags += "i";
    else if (m === "m") flags += "m";
    else if (m === "s") flags += "s";
    else if (m === "u") flags += "u";
    else if (m === "x") extended = true;
    else if ("AUDSJ".includes(m)) {
      // compatibility no-op
    } else if (m === "e") {
      throw new Error("Modifier 'e' is not supported for security reasons");
    } else {
      throw new Error(`Unsupported modifier '${m}'`);
    }
  }

  const src = extended ? stripExtended(body) : body;
  // De-duplicate flags
  flags = [...new Set(flags.split(""))].join("");
  return { source: src, flags, modifiers: mods };
}

function compile(pat, single = false) {
  try {
    const { source, flags } = parsePattern(pat);
    const f = single ? flags.replace("g", "") : flags;
    setPregError(PREG_NO_ERROR, "PREG_NO_ERROR");
    return new RegExp(source, f);
  } catch (e) {
    setPregError(PREG_INTERNAL_ERROR, String(e?.message ?? e));
    return null;
  }
}

function withOffsets(match, baseIndex, unmatchedAsNull = false) {
  // match is RegExpExecArray
  const out = [];
  out[0] = [match[0], baseIndex];
  // Best-effort for groups: search within full match from left to right
  let cursor = 0;
  for (let i = 1; i < match.length; i++) {
    const g = match[i];
    if (g == null) {
      out[i] = [unmatchedAsNull ? null : "", -1];
      continue;
    }
    const pos = match[0].indexOf(g, cursor);
    const off = pos >= 0 ? baseIndex + pos : -1;
    out[i] = [g, off];
    cursor = pos >= 0 ? pos + g.length : cursor;
  }
  // named groups
  if (match.groups) {
    for (const [k, v] of Object.entries(match.groups)) {
      if (v == null) out[k] = [unmatchedAsNull ? null : "", -1];
      else {
        const pos = match[0].indexOf(v);
        out[k] = [v, pos >= 0 ? baseIndex + pos : -1];
      }
    }
  }
  return out;
}

function withValues(match, unmatchedAsNull = false) {
  const out = [];
  out[0] = match[0];
  for (let i = 1; i < match.length; i++) out[i] = match[i] ?? (unmatchedAsNull ? null : "");
  if (match.groups) for (const [k, v] of Object.entries(match.groups)) out[k] = v ?? (unmatchedAsNull ? null : "");
  return out;
}

/**
 * preg_last_error — Returns the error code of the last PCRE regex execution.
 * @see https://www.php.net/manual/en/function.preg-last-error.php
 * @returns {number}
 */
export function preg_last_error() {
  assertArity("preg_last_error", arguments, 0, 0);
  return __pregLastError;
}

/**
 * preg_last_error_msg — Returns the error message of the last PCRE regex execution.
 * @see https://www.php.net/manual/en/function.preg-last-error-msg.php
 * @returns {string}
 */
export function preg_last_error_msg() {
  assertArity("preg_last_error_msg", arguments, 0, 0);
  return __pregLastErrorMsg;
}

/**
 * preg_quote — Quote regular expression characters.
 * @see https://www.php.net/manual/en/function.preg-quote.php
 */
export function preg_quote(str, delimiter = null) {
  assertArity("preg_quote", arguments, 1, 2);
  assertString("preg_quote", 1, str);
  if (delimiter !== null) assertString("preg_quote", 2, delimiter);
  const del = delimiter ? delimiter.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&") : "";
  return str.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(new RegExp(del, "g"), "\\$&");
}

/**
 * preg_match — Perform a regular expression match.
 * @see https://www.php.net/manual/en/function.preg-match.php
 */
export function preg_match(pattern, subject, matches = null, flags = 0, offset = 0) {
  assertArity("preg_match", arguments, 2, 5);
  assertString("preg_match", 1, pattern);
  assertString("preg_match", 2, subject);
  if (matches !== null && typeof matches !== "object") typeError("preg_match", 3, "array", matches);
  assertNumber("preg_match", 4, flags);
  assertNumber("preg_match", 5, offset);

  const re = compile(pattern, true);
  if (!re) return false;

  const subj = offset ? subject.slice(offset) : subject;
  const m = re.exec(subj);
  if (!m) return 0;

  const baseIndex = (m.index ?? 0) + offset;
  const unmatchedAsNull = (flags & PREG_UNMATCHED_AS_NULL) === PREG_UNMATCHED_AS_NULL;
  const out = (flags & PREG_OFFSET_CAPTURE) ? withOffsets(m, baseIndex, unmatchedAsNull) : withValues(m, unmatchedAsNull);

  if (matches) {
    // mutate provided object/array
    if (Array.isArray(matches)) {
      matches.length = 0;
      for (const k of Object.keys(out)) matches[k] = out[k];
    } else {
      for (const k of Object.keys(matches)) delete matches[k];
      Object.assign(matches, out);
    }
  }
  return 1;
}

/**
 * preg_match_all — Perform a global regular expression match.
 * @see https://www.php.net/manual/en/function.preg-match-all.php
 */
export function preg_match_all(pattern, subject, matches = null, flags = PREG_PATTERN_ORDER, offset = 0) {
  assertArity("preg_match_all", arguments, 2, 5);
  assertString("preg_match_all", 1, pattern);
  assertString("preg_match_all", 2, subject);
  if (matches !== null && typeof matches !== "object") typeError("preg_match_all", 3, "array", matches);
  assertNumber("preg_match_all", 4, flags);
  assertNumber("preg_match_all", 5, offset);

  const re = compile(pattern, false);
  if (!re) return false;

  const subj = offset ? subject.slice(offset) : subject;
  let m;
  const all = [];
  while ((m = re.exec(subj)) !== null) {
    const baseIndex = (m.index ?? 0) + offset;
    const unmatchedAsNull = (flags & PREG_UNMATCHED_AS_NULL) === PREG_UNMATCHED_AS_NULL;
    const row = (flags & PREG_OFFSET_CAPTURE) ? withOffsets(m, baseIndex, unmatchedAsNull) : withValues(m, unmatchedAsNull);
    all.push(row);
    if (m[0] === "") re.lastIndex++; // avoid infinite loop
  }

  const count = all.length;

  let out;
  if ((flags & PREG_SET_ORDER) === PREG_SET_ORDER) {
    out = all;
  } else {
    // PREG_PATTERN_ORDER: group by capture index/name
    out = {};
    for (let i = 0; i < all.length; i++) {
      const row = all[i];
      for (const k of Object.keys(row)) {
        if (!out[k]) out[k] = [];
        out[k].push(row[k]);
      }
    }
    // Ensure numeric ordering keys exist
    if (!out[0]) out[0] = all.map((r) => r[0]);
  }

  if (matches) {
    if (Array.isArray(matches)) {
      matches.length = 0;
      Object.assign(matches, out);
    } else {
      for (const k of Object.keys(matches)) delete matches[k];
      Object.assign(matches, out);
    }
  }
  return count;
}

/**
 * preg_replace — Perform a regular expression search and replace.
 * @see https://www.php.net/manual/en/function.preg-replace.php
 */
export function preg_replace(pattern, replacement, subject, limit = -1, countObj = null) {
  assertArity("preg_replace", arguments, 3, 5);
  if (!Array.isArray(pattern) && typeof pattern !== "string") typeError("preg_replace", 1, "string|array", pattern);
  if (!Array.isArray(replacement) && typeof replacement !== "string") typeError("preg_replace", 2, "string|array", replacement);
  if (!Array.isArray(subject) && typeof subject !== "string") typeError("preg_replace", 3, "string|array", subject);
  assertNumber("preg_replace", 4, limit);
  if (countObj !== null && typeof countObj !== "object") typeError("preg_replace", 5, "object", countObj);

  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const replacements = Array.isArray(replacement) ? replacement : [replacement];

  let total = 0;
  const replaceOne = (subj) => {
    let out = subj;
    for (let i = 0; i < patterns.length; i++) {
      const p = patterns[i];
      const r = replacements[i] ?? replacements[0] ?? "";
      assertString("preg_replace", 1, p);
      assertString("preg_replace", 2, r);

      const re = compile(p, false);
      if (!re) return false;

      let localCount = 0;
      if (limit >= 0) {
        out = out.replace(re, (...args) => {
          if (localCount >= limit) return args[0];
          localCount++;
          return String(r);
        });
      } else {
        out = out.replace(re, () => {
          localCount++;
          return String(r);
        });
      }
      total += localCount;
    }
    return out;
  };

  const result = Array.isArray(subject) ? subject.map((s) => replaceOne(String(s))) : replaceOne(String(subject));
  if (countObj) countObj.count = total;
  return result;
}

/**
 * preg_split — Split string by a regular expression.
 * @see https://www.php.net/manual/en/function.preg-split.php
 */
export function preg_split(pattern, subject, limit = -1, flags = 0) {
  assertArity("preg_split", arguments, 2, 4);
  assertString("preg_split", 1, pattern);
  assertString("preg_split", 2, subject);
  assertNumber("preg_split", 3, limit);
  assertNumber("preg_split", 4, flags);

  const re = compile(pattern, false);
  if (!re) return false;

  const pieces = subject.split(re);
  if (limit > 0) return pieces.slice(0, limit);
  return pieces;
}

/**
 * preg_grep — Return array entries that match the pattern.
 * @see https://www.php.net/manual/en/function.preg-grep.php
 */
export function preg_grep(pattern, input, flags = 0) {
  assertArity("preg_grep", arguments, 2, 3);
  assertString("preg_grep", 1, pattern);
  if (!Array.isArray(input)) typeError("preg_grep", 2, "array", input);
  assertNumber("preg_grep", 3, flags);

  const re = compile(pattern, true);
  if (!re) return false;

  const invert = (flags & 1) === 1; // PREG_GREP_INVERT = 1
  const out = [];
  for (const v of input) {
    const ok = re.test(String(v));
    if ((ok && !invert) || (!ok && invert)) out.push(v);
  }
  return out;
}
