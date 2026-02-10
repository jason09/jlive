/**
 * PHP-like array functions.
 *
 * Notes:
 * - PHP arrays are ordered maps. In JS we support JS arrays and plain objects.
 * - For functions that accept both arrays and objects in PHP, we accept `any[]` or `Record<string, any>`.
 *
 * @module php/array
 */

import { assertArity, assertArray, assertObject, assertString, phpType, typeError } from "../internal/assert.js";

/** @param {any[]|Record<string, any>} v */
function isArrayOrObject(v) {
  return Array.isArray(v) || (v !== null && typeof v === "object");
}

/**
 * PHP-like count().
 * @param {any[]|Record<string, any>} value
 * @param {number} [mode]
 * @returns {number}
 */
export function count(value, mode = 0) {
  assertArity("count", arguments, 1, 2);
  if (!isArrayOrObject(value)) typeError("count", 1, "array", value);
  if (typeof mode !== "number") typeError("count", 2, "int", mode);
  if (Array.isArray(value)) return value.length;
  return Object.keys(value).length;
}

/**
 * PHP-like array_values().
 * @param {any[]|Record<string, any>} array
 * @returns {any[]}
 */
export function array_values(array) {
  assertArity("array_values", arguments, 1, 1);
  if (Array.isArray(array)) return [...array];
  if (array && typeof array === "object") return Object.values(array);
  typeError("array_values", 1, "array", array);
}

/**
 * PHP-like array_keys().
 * @param {any[]|Record<string, any>} array
 * @param {any} [searchValue]
 * @param {boolean} [strict=false]
 * @returns {Array<string|number>}
 */
export function array_keys(array, searchValue, strict = false) {
  assertArity("array_keys", arguments, 1, 3);
  if (!isArrayOrObject(array)) typeError("array_keys", 1, "array", array);
  const keys = Array.isArray(array) ? array.map((_, i) => i) : Object.keys(array);
  if (arguments.length === 1) return keys;
  if (typeof strict !== "boolean") typeError("array_keys", 3, "bool", strict);
  return keys.filter((k) => {
    const v = Array.isArray(array) ? array[/** @type {number} */ (k)] : array[/** @type {string} */ (k)];
    return strict ? v === searchValue : v == searchValue;
  });
}

/**
 * PHP-like array_key_exists().
 * @param {string|number} key
 * @param {Record<string, any>|any[]} array
 * @returns {boolean}
 */
export function array_key_exists(key, array) {
  assertArity("array_key_exists", arguments, 2, 2);
  if (typeof key !== "string" && typeof key !== "number") typeError("array_key_exists", 1, "string", key);
  if (!isArrayOrObject(array)) typeError("array_key_exists", 2, "array", array);
  return Object.prototype.hasOwnProperty.call(array, key);
}

/**
 * PHP-like in_array().
 * @param {any} needle
 * @param {any[]|Record<string, any>} haystack
 * @param {boolean} [strict=false]
 * @returns {boolean}
 */
export function in_array(needle, haystack, strict = false) {
  assertArity("in_array", arguments, 2, 3);
  if (!isArrayOrObject(haystack)) typeError("in_array", 2, "array", haystack);
  if (typeof strict !== "boolean") typeError("in_array", 3, "bool", strict);
  const values = Array.isArray(haystack) ? haystack : Object.values(haystack);
  return strict ? values.some((v) => v === needle) : values.some((v) => v == needle);
}

/**
 * PHP-like array_search().
 * @param {any} needle
 * @param {any[]|Record<string, any>} haystack
 * @param {boolean} [strict=false]
 * @returns {string|number|false}
 */
export function array_search(needle, haystack, strict = false) {
  assertArity("array_search", arguments, 2, 3);
  if (!isArrayOrObject(haystack)) typeError("array_search", 2, "array", haystack);
  if (typeof strict !== "boolean") typeError("array_search", 3, "bool", strict);
  if (Array.isArray(haystack)) {
    for (let i = 0; i < haystack.length; i++) {
      const ok = strict ? haystack[i] === needle : haystack[i] == needle;
      if (ok) return i;
    }
    return false;
  }
  for (const k of Object.keys(haystack)) {
    const ok = strict ? haystack[k] === needle : haystack[k] == needle;
    if (ok) return k;
  }
  return false;
}

/**
 * PHP-like array_merge().
 * @param  {...(any[]|Record<string, any>)} arrays
 * @returns {any[]|Record<string, any>}
 */
export function array_merge(...arrays) {
  assertArity("array_merge", arguments, 1);
  const allArrays = arrays.every(Array.isArray);
  if (allArrays) return arrays.flat();
  // object merge: numeric keys become appended like PHP (best-effort)
  /** @type {Record<string, any>} */
  const out = {};
  let n = 0;
  for (const a of arrays) {
    if (!isArrayOrObject(a)) typeError("array_merge", 1, "array", a);
    if (Array.isArray(a)) {
      for (const v of a) out[String(n++)] = v;
    } else {
      for (const [k, v] of Object.entries(a)) {
        if (/^\d+$/.test(k)) out[String(n++)] = v;
        else out[k] = v;
      }
    }
  }
  return out;
}

/**
 * PHP-like array_merge_recursive().
 * @param  {...Record<string, any>} arrays
 * @returns {Record<string, any>}
 */
export function array_merge_recursive(...arrays) {
  assertArity("array_merge_recursive", arguments, 1);
  /** @type {Record<string, any>} */
  const out = {};
  for (const a of arrays) {
    if (!a || typeof a !== "object" || Array.isArray(a)) typeError("array_merge_recursive", 1, "array", a);
    for (const [k, v] of Object.entries(a)) {
      if (!(k in out)) {
        out[k] = v;
        continue;
      }
      const prev = out[k];
      if (Array.isArray(prev)) out[k] = [...prev, v];
      else if (prev && typeof prev === "object" && v && typeof v === "object") out[k] = array_merge_recursive(prev, v);
      else out[k] = [prev, v];
    }
  }
  return out;
}

/**
 * PHP-like array_diff() (values).
 * @param {any[]|Record<string, any>} array
 * @param  {...(any[]|Record<string, any>)} arrays
 * @returns {any[]}
 */
export function array_diff(array, ...arrays) {
  assertArity("array_diff", arguments, 2);
  const base = Array.isArray(array) ? array : Object.values(array);
  const set = new Set(arrays.flatMap((a) => (Array.isArray(a) ? a : Object.values(a))));
  return base.filter((v) => !set.has(v));
}

/**
 * array_diff_assoc() (key+value).
 * @param {Record<string, any>|any[]} array
 * @param  {...(Record<string, any>|any[])} arrays
 * @returns {Record<string, any>}
 */
export function array_diff_assoc(array, ...arrays) {
  assertArity("array_diff_assoc", arguments, 2);
  if (!isArrayOrObject(array)) typeError("array_diff_assoc", 1, "array", array);
  const hay = arrays.map((a) => (Array.isArray(a) ? Object.fromEntries(a.map((v, i) => [String(i), v])) : a));
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, i) => [String(i), v])) : array;
  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const h of hay) {
      if (Object.prototype.hasOwnProperty.call(h, k) && h[k] === v) continue outer;
    }
    out[k] = v;
  }
  return out;
}

/**
 * array_intersect() (values).
 * @param {any[]|Record<string, any>} array
 * @param  {...(any[]|Record<string, any>)} arrays
 * @returns {any[]}
 */
export function array_intersect(array, ...arrays) {
  assertArity("array_intersect", arguments, 2);
  const base = Array.isArray(array) ? array : Object.values(array);
  const sets = arrays.map((a) => new Set(Array.isArray(a) ? a : Object.values(a)));
  return base.filter((v) => sets.every((s) => s.has(v)));
}

/**
 * array_column().
 * @param {Array<Record<string, any>>} input
 * @param {string|number|null} columnKey
 * @param {string|number|null} [indexKey]
 * @returns {any[]|Record<string, any>}
 */
export function array_column(input, columnKey, indexKey = null) {
  assertArity("array_column", arguments, 2, 3);
  if (!Array.isArray(input)) typeError("array_column", 1, "array", input);
  const out = indexKey == null ? [] : {};
  for (const row of input) {
    if (row === null || typeof row !== "object") continue;
    const val = columnKey == null ? row : row[/** @type {any} */ (columnKey)];
    if (indexKey == null) {
      /** @type {any[]} */ (out).push(val);
    } else {
      const key = row[/** @type {any} */ (indexKey)];
      /** @type {Record<string, any>} */ (out)[String(key)] = val;
    }
  }
  return out;
}

/**
 * array_chunk().
 * @param {any[]} array
 * @param {number} length
 * @param {boolean} [preserveKeys=false]
 * @returns {any[]|Record<string, any>[]}
 */
export function array_chunk(array, length, preserveKeys = false) {
  assertArity("array_chunk", arguments, 2, 3);
  assertArray("array_chunk", 1, array);
  if (typeof length !== "number") typeError("array_chunk", 2, "int", length);
  if (typeof preserveKeys !== "boolean") typeError("array_chunk", 3, "bool", preserveKeys);
  if (length <= 0) throw new RangeError("Warning: array_chunk() length must be greater than 0");
  const out = [];
  for (let i = 0; i < array.length; i += length) {
    const slice = array.slice(i, i + length);
    if (!preserveKeys) out.push(slice);
    else {
      const obj = {};
      for (let j = 0; j < slice.length; j++) obj[String(i + j)] = slice[j];
      out.push(obj);
    }
  }
  return out;
}

/**
 * array_unique().
 * @param {any[]} array
 * @returns {any[]}
 */
export function array_unique(array) {
  assertArity("array_unique", arguments, 1, 1);
  assertArray("array_unique", 1, array);
  const seen = new Set();
  const out = [];
  for (const v of array) {
    const key = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/**
 * array_sum().
 * @param {any[]} array
 * @returns {number}
 */
export function array_sum(array) {
  assertArity("array_sum", arguments, 1, 1);
  assertArray("array_sum", 1, array);
  let sum = 0;
  for (const v of array) sum += Number(v) || 0;
  return sum;
}

/**
 * array_product().
 * @param {any[]} array
 * @returns {number}
 */
export function array_product(array) {
  assertArity("array_product", arguments, 1, 1);
  assertArray("array_product", 1, array);
  let prod = 1;
  for (const v of array) prod *= Number(v) || 0;
  return prod;
}

/**
 * array_map().
 * @param {Function|null} callback
 * @param  {...any[]} arrays
 * @returns {any[]}
 */
export function array_map(callback, ...arrays) {
  assertArity("array_map", arguments, 2);
  if (callback !== null && typeof callback !== "function") typeError("array_map", 1, "callable", callback);
  arrays.forEach((a, i) => assertArray("array_map", i + 2, a));
  const max = Math.max(...arrays.map((a) => a.length));
  const out = [];
  for (let i = 0; i < max; i++) {
    const args = arrays.map((a) => a[i]);
    out.push(callback ? callback(...args) : args);
  }
  return out;
}

/**
 * array_filter().
 * @param {any[]} array
 * @param {Function|null} [callback=null]
 * @returns {any[]}
 */
export function array_filter(array, callback = null) {
  assertArity("array_filter", arguments, 1, 2);
  assertArray("array_filter", 1, array);
  if (callback !== null && typeof callback !== "function") typeError("array_filter", 2, "callable", callback);
  return callback ? array.filter((v, i) => callback(v, i)) : array.filter(Boolean);
}

/**
 * array_reduce().
 * @param {any[]} array
 * @param {Function} callback
 * @param {any} [initial]
 * @returns {any}
 */
export function array_reduce(array, callback, initial) {
  assertArity("array_reduce", arguments, 2, 3);
  assertArray("array_reduce", 1, array);
  if (typeof callback !== "function") typeError("array_reduce", 2, "callable", callback);
  return arguments.length === 3 ? array.reduce(callback, initial) : array.reduce(callback);
}

/**
 * array_flip().
 * @param {Record<string, any>|any[]} array
 * @returns {Record<string, string|number>}
 */
export function array_flip(array) {
  assertArity("array_flip", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("array_flip", 1, "array", array);
  /** @type {Record<string, string|number>} */
  const out = {};
  const entries = Array.isArray(array) ? array.map((v, i) => [String(i), v]) : Object.entries(array);
  for (const [k, v] of entries) {
    if (typeof v !== "string" && typeof v !== "number") {
      throw new TypeError("Warning: array_flip(): Can only flip string and integer values");
    }
    out[String(v)] = /^\d+$/.test(k) ? Number(k) : k;
  }
  return out;
}

/**
 * array_combine().
 * @param {any[]} keys
 * @param {any[]} values
 * @returns {Record<string, any>}
 */
export function array_combine(keys, values) {
  assertArity("array_combine", arguments, 2, 2);
  assertArray("array_combine", 1, keys);
  assertArray("array_combine", 2, values);
  if (keys.length !== values.length) throw new RangeError("Warning: array_combine(): Both parameters should have an equal number of elements");
  /** @type {Record<string, any>} */
  const out = {};
  for (let i = 0; i < keys.length; i++) out[String(keys[i])] = values[i];
  return out;
}

/**
 * range().
 * @param {number|string} start
 * @param {number|string} end
 * @param {number} [step=1]
 * @returns {any[]}
 */
export function range(start, end, step = 1) {
  assertArity("range", arguments, 2, 3);
  if (typeof step !== "number") typeError("range", 3, "int", step);
  if (step === 0) throw new RangeError("Warning: range(): step must not be 0");
  const isChar = typeof start === "string" && typeof end === "string" && start.length === 1 && end.length === 1;
  if (isChar) {
    const s = start.codePointAt(0);
    const e = end.codePointAt(0);
    if (s === undefined || e === undefined) return [];
    const dir = s <= e ? 1 : -1;
    const realStep = Math.abs(step) * dir;
    const out = [];
    for (let c = s; dir > 0 ? c <= e : c >= e; c += realStep) out.push(String.fromCodePoint(c));
    return out;
  }
  if (typeof start !== "number") typeError("range", 1, "number", start);
  if (typeof end !== "number") typeError("range", 2, "number", end);
  const dir = start <= end ? 1 : -1;
  const realStep = Math.abs(step) * dir;
  const out = [];
  for (let x = start; dir > 0 ? x <= end : x >= end; x += realStep) out.push(x);
  return out;
}

/**
 * shuffle() (in-place).
 * @param {any[]} array
 * @returns {boolean}
 */
export function shuffle(array) {
  assertArity("shuffle", arguments, 1, 1);
  assertArray("shuffle", 1, array);
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return true;
}

/**
 * sort() (in-place).
 * @param {any[]} array
 * @param {number} [flags=0]
 * @returns {boolean}
 */
export function sort(array, flags = 0) {
  assertArity("sort", arguments, 1, 2);
  assertArray("sort", 1, array);
  if (typeof flags !== "number") typeError("sort", 2, "int", flags);
  array.sort((a, b) => String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" }));
  return true;
}

/**
 * asort() (keep keys; for arrays this is just sort).
 * @param {any[]} array
 * @param {number} [flags=0]
 * @returns {boolean}
 */
export function asort(array, flags = 0) {
  return sort(array, flags);
}

/**
 * compact() best-effort (JS doesn't have PHP symbol table).
 * Accepts an object map of variables and a list of names.
 * @param {Record<string, any>} scope
 * @param  {...string} names
 * @returns {Record<string, any>}
 */

/**
 * PHP rsort() — Sort an array in descending order.
 * @see https://www.php.net/manual/en/function.rsort.php
 * @param {any[]} array
 * @param {number} [flags=0]
 * @returns {boolean}
 */
export function rsort(array, flags = 0) {
  assertArity("rsort", arguments, 1, 2);
  assertArray("rsort", 1, array);
  if (typeof flags !== "number") typeError("rsort", 2, "int", flags);
  array.sort((a, b) => String(b).localeCompare(String(a), "en", { numeric: true, sensitivity: "base" }));
  return true;
}

function __toOrderedObject(entries) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [k, v] of entries) out[k] = v;
  return out;
}

/**
 * PHP ksort() — Sort an array by key in ascending order.
 * Works for plain objects (associative arrays). For JS arrays it sorts by numeric index (no-op).
 * @see https://www.php.net/manual/en/function.ksort.php
 * @param {any[]|Record<string, any>} array
 * @param {number} [flags=0]
 * @returns {boolean}
 */
export function ksort(array, flags = 0) {
  assertArity("ksort", arguments, 1, 2);
  if (!isArrayOrObject(array)) typeError("ksort", 1, "array", array);
  if (typeof flags !== "number") typeError("ksort", 2, "int", flags);
  if (Array.isArray(array)) return true; // already keyed by index
  const entries = Object.entries(array).sort(([a], [b]) => String(a).localeCompare(String(b), "en", { numeric: true }));
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * PHP krsort() — Sort an array by key in descending order.
 * @see https://www.php.net/manual/en/function.krsort.php
 */
export function krsort(array, flags = 0) {
  assertArity("krsort", arguments, 1, 2);
  if (!isArrayOrObject(array)) typeError("krsort", 1, "array", array);
  if (typeof flags !== "number") typeError("krsort", 2, "int", flags);
  if (Array.isArray(array)) return true;
  const entries = Object.entries(array).sort(([a], [b]) => String(b).localeCompare(String(a), "en", { numeric: true }));
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * PHP arsort() — Sort array in descending order and maintain index association.
 * For objects: sorts by value desc, preserves keys. For arrays: same as rsort().
 * @see https://www.php.net/manual/en/function.arsort.php
 */
export function arsort(array, flags = 0) {
  assertArity("arsort", arguments, 1, 2);
  if (!isArrayOrObject(array)) typeError("arsort", 1, "array", array);
  if (typeof flags !== "number") typeError("arsort", 2, "int", flags);
  if (Array.isArray(array)) return rsort(array, flags);
  const entries = Object.entries(array).sort(([, va], [, vb]) =>
    String(vb).localeCompare(String(va), "en", { numeric: true, sensitivity: "base" }),
  );
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * Improved asort() parity: for objects, sort by value asc while preserving keys.
 * @see https://www.php.net/manual/en/function.asort.php
 */
export function asort_assoc(array, flags = 0) {
  assertArity("asort_assoc", arguments, 1, 2);
  if (!isArrayOrObject(array)) typeError("asort_assoc", 1, "array", array);
  if (typeof flags !== "number") typeError("asort_assoc", 2, "int", flags);
  if (Array.isArray(array)) return sort(array, flags);
  const entries = Object.entries(array).sort(([, va], [, vb]) =>
    String(va).localeCompare(String(vb), "en", { numeric: true, sensitivity: "base" }),
  );
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * PHP usort() — Sort an array by values using a user-defined comparison function.
 * @see https://www.php.net/manual/en/function.usort.php
 * @param {any[]} array
 * @param {(a:any,b:any)=>number} callback
 * @returns {boolean}
 */
export function usort(array, callback) {
  assertArity("usort", arguments, 2, 2);
  assertArray("usort", 1, array);
  if (typeof callback !== "function") typeError("usort", 2, "callable", callback);
  array.sort((a, b) => callback(a, b));
  return true;
}

/**
 * PHP uasort() — Sort an array with a user-defined comparison function and maintain index association.
 * For objects, sorts by values and preserves keys.
 * @see https://www.php.net/manual/en/function.uasort.php
 */
export function uasort(array, callback) {
  assertArity("uasort", arguments, 2, 2);
  if (!isArrayOrObject(array)) typeError("uasort", 1, "array", array);
  if (typeof callback !== "function") typeError("uasort", 2, "callable", callback);
  if (Array.isArray(array)) return usort(array, callback);
  const entries = Object.entries(array).sort(([, a], [, b]) => callback(a, b));
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * PHP uksort() — Sort an array by keys using a user-defined comparison function.
 * @see https://www.php.net/manual/en/function.uksort.php
 */
export function uksort(array, callback) {
  assertArity("uksort", arguments, 2, 2);
  if (!isArrayOrObject(array)) typeError("uksort", 1, "array", array);
  if (typeof callback !== "function") typeError("uksort", 2, "callable", callback);
  if (Array.isArray(array)) return true;
  const entries = Object.entries(array).sort(([ka], [kb]) => callback(ka, kb));
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * PHP natsort() — Natural order sort.
 * @see https://www.php.net/manual/en/function.natsort.php
 */
export function natsort(array) {
  assertArity("natsort", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("natsort", 1, "array", array);
  const cmp = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
  if (Array.isArray(array)) {
    array.sort(cmp);
    return true;
  }
  const entries = Object.entries(array).sort(([, a], [, b]) => cmp(a, b));
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

/**
 * PHP natcasesort() — Case insensitive natural order sort.
 * @see https://www.php.net/manual/en/function.natcasesort.php
 */
export function natcasesort(array) {
  assertArity("natcasesort", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("natcasesort", 1, "array", array);
  const cmp = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "accent" });
  if (Array.isArray(array)) {
    array.sort(cmp);
    return true;
  }
  const entries = Object.entries(array).sort(([, a], [, b]) => cmp(a, b));
  const ordered = __toOrderedObject(entries);
  for (const k of Object.keys(array)) delete array[k];
  Object.assign(array, ordered);
  return true;
}

export function compact(scope, ...names) {
  assertArity("compact", arguments, 2);
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) typeError("compact", 1, "array", scope);
  names.forEach((n, i) => {
    if (typeof n !== "string") typeError("compact", i + 2, "string", n);
  });
  /** @type {Record<string, any>} */
  const out = {};
  for (const n of names) if (Object.prototype.hasOwnProperty.call(scope, n)) out[n] = scope[n];
  return out;
}

/**
 * array_key_first().
 * @param {Record<string, any>|any[]} array
 * @returns {string|number|null}
 */
export function array_key_first(array) {
  assertArity("array_key_first", arguments, 1, 1);
  if (Array.isArray(array)) return array.length ? 0 : null;
  if (!array || typeof array !== "object") typeError("array_key_first", 1, "array", array);
  const k = Object.keys(array)[0];
  return k === undefined ? null : k;
}

/**
 * array_key_last().
 * @param {Record<string, any>|any[]} array
 * @returns {string|number|null}
 */
export function array_key_last(array) {
  assertArity("array_key_last", arguments, 1, 1);
  if (Array.isArray(array)) return array.length ? array.length - 1 : null;
  if (!array || typeof array !== "object") typeError("array_key_last", 1, "array", array);
  const ks = Object.keys(array);
  return ks.length ? ks[ks.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Legacy compatibility (from original jLive v0.0.2)
// ---------------------------------------------------------------------------

/**
 * array_count_values(array)
 * @param {any[]} array
 * @returns {Record<string, number>}
 */
export function array_count_values(array) {
  assertArity("array_count_values", arguments, 1, 1);
  assertArray("array_count_values", 1, array);
  /** @type {Record<string, number>} */
  const out = {};
  for (const v of array) {
    const k = String(v);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * array_change_key_case(array, case)
 * @param {Record<string, any>} array
 * @param {number} [cs=0] 0=lower, 1=upper
 * @returns {Record<string, any>}
 */
export function array_change_key_case(array, cs = 0) {
  assertArity("array_change_key_case", arguments, 1, 2);
  if (!array || typeof array !== "object" || Array.isArray(array)) typeError("array_change_key_case", 1, "array", array);
  if (cs !== undefined && typeof cs !== "number") typeError("array_change_key_case", 2, "int", cs);
  /** @type {Record<string, any>} */
  const out = {};
  for (const [k, v] of Object.entries(array)) {
    out[cs ? k.toUpperCase() : k.toLowerCase()] = v;
  }
  return out;
}

/**
 * array_fill(startIndex, count, value)
 * @param {number} startIndex
 * @param {number} count
 * @param {any} value
 * @returns {Record<number, any>}
 */
export function array_fill(startIndex, count, value) {
  assertArity("array_fill", arguments, 3, 3);
  if (typeof startIndex !== "number") typeError("array_fill", 1, "int", startIndex);
  if (typeof count !== "number") typeError("array_fill", 2, "int", count);
  /** @type {Record<number, any>} */
  const out = {};
  for (let i = 0; i < count; i++) out[startIndex + i] = value;
  return out;
}

/**
 * array_fill_keys(keys, value)
 * @param {Array<string|number>} keys
 * @param {any} value
 * @returns {Record<string, any>}
 */
export function array_fill_keys(keys, value) {
  assertArity("array_fill_keys", arguments, 2, 2);
  assertArray("array_fill_keys", 1, keys);
  /** @type {Record<string, any>} */
  const out = {};
  for (const k of keys) out[String(k)] = value;
  return out;
}

/**
 * array_push(array, ...values)
 * @param {any[]} array
 * @param  {...any} values
 * @returns {number}
 */
export function array_push(array, ...values) {
  assertArity("array_push", arguments, 1);
  assertArray("array_push", 1, array);
  return array.push(...values);
}

/**
 * array_pop(array)
 * @param {any[]} array
 * @returns {any}
 */
export function array_pop(array) {
  assertArity("array_pop", arguments, 1, 1);
  assertArray("array_pop", 1, array);
  return array.pop();
}

/**
 * array_shift(array)
 * @param {any[]} array
 * @returns {any}
 */
export function array_shift(array) {
  assertArity("array_shift", arguments, 1, 1);
  assertArray("array_shift", 1, array);
  return array.shift();
}

/**
 * array_unshift(array, ...values)
 * @param {any[]} array
 * @param  {...any} values
 * @returns {number}
 */
export function array_unshift(array, ...values) {
  assertArity("array_unshift", arguments, 1);
  assertArray("array_unshift", 1, array);
  return array.unshift(...values);
}

/**
 * array_splice(array, offset, length, replacement)
 * @param {any[]} array
 * @param {number} offset
 * @param {number} [length]
 * @param  {...any} replacement
 * @returns {any[]}
 */
export function array_splice(array, offset, length, ...replacement) {
  assertArity("array_splice", arguments, 2);
  assertArray("array_splice", 1, array);
  if (typeof offset !== "number") typeError("array_splice", 2, "int", offset);
  if (length !== undefined && typeof length !== "number") typeError("array_splice", 3, "int", length);
  return array.splice(offset, length ?? (array.length - offset), ...replacement);
}

/**
 * array_pad(array, size, value)
 * @param {any[]} array
 * @param {number} size
 * @param {any} value
 * @returns {any[]}
 */
export function array_pad(array, size, value) {
  assertArity("array_pad", arguments, 3, 3);
  assertArray("array_pad", 1, array);
  if (typeof size !== "number") typeError("array_pad", 2, "int", size);
  const out = array.slice();
  const padLen = Math.abs(size) - out.length;
  if (padLen <= 0) return out;
  const pad = Array.from({ length: padLen }, () => value);
  return size > 0 ? out.concat(pad) : pad.concat(out);
}

/**
 * array_reverse(array, preserveKeys)
 * @param {any[]} array
 * @param {boolean} [preserveKeys=false]
 * @returns {any[]|Record<string, any>}
 */
export function array_reverse(array, preserveKeys = false) {
  assertArity("array_reverse", arguments, 1, 2);
  assertArray("array_reverse", 1, array);
  if (typeof preserveKeys !== "boolean") typeError("array_reverse", 2, "bool", preserveKeys);
  if (!preserveKeys) return array.slice().reverse();
  /** @type {Record<string, any>} */
  const out = {};
  for (let i = array.length - 1; i >= 0; i--) out[String(i)] = array[i];
  return out;
}

/**
 * array_slice(array, offset, length, preserveKeys)
 * @param {any[]} array
 * @param {number} offset
 * @param {number} [length]
 * @param {boolean} [preserveKeys=false]
 * @returns {any[]|Record<string, any>}
 */
export function array_slice(array, offset, length, preserveKeys = false) {
  assertArity("array_slice", arguments, 2, 4);
  assertArray("array_slice", 1, array);
  if (typeof offset !== "number") typeError("array_slice", 2, "int", offset);
  if (length !== undefined && typeof length !== "number") typeError("array_slice", 3, "int", length);
  if (typeof preserveKeys !== "boolean") typeError("array_slice", 4, "bool", preserveKeys);
  const sliced = array.slice(offset, length === undefined ? undefined : offset + length);
  if (!preserveKeys) return sliced;
  /** @type {Record<string, any>} */
  const out = {};
  for (let i = 0; i < sliced.length; i++) out[String(offset + i)] = sliced[i];
  return out;
}

/**
 * array_rand(array, num)
 * @param {any[]|Record<string, any>} array
 * @param {number} [num=1]
 * @returns {string|number|Array<string|number>}
 */
export function array_rand(array, num = 1) {
  assertArity("array_rand", arguments, 1, 2);
  if (num !== undefined && typeof num !== "number") typeError("array_rand", 2, "int", num);
  const keys = Array.isArray(array) ? array.map((_, i) => i) : Object.keys(array ?? {});
  if (!keys.length) throw new RangeError("Warning: array_rand() expects parameter 1 to be a non-empty array");
  if (num === 1) return keys[Math.floor(Math.random() * keys.length)];
  const shuffled = keys.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(num, shuffled.length));
}

/**
 * array_walk(array, callback)
 * @param {Record<string, any>|any[]} array
 * @param {(value:any, key:any)=>void} callback
 * @returns {boolean}
 */
export function array_walk(array, callback) {
  assertArity("array_walk", arguments, 2, 2);
  if (typeof callback !== "function") typeError("array_walk", 2, "callable", callback);
  if (Array.isArray(array)) {
    array.forEach((v, i) => callback(v, i));
    return true;
  }
  if (!array || typeof array !== "object") typeError("array_walk", 1, "array", array);
  for (const [k, v] of Object.entries(array)) callback(v, k);
  return true;
}


/**
 * foreach — Iterate over array/object like PHP foreach.
 * In JS, `foreach` is a reserved keyword, so the exported function is `foreach_`.
 * `JlivePHP` exposes it as `foreach`.
 *
 * @param {any[]|Record<string, any>} value
 * @param {(item:any, key:string|number, source:any)=>void} callback
 * @returns {void}
 */
export function foreach_(value, callback) {
  assertArity("foreach", arguments, 2, 2);
  if (!isArrayOrObject(value)) typeError("foreach", 1, "array", value);
  if (typeof callback !== "function") typeError("foreach", 2, "callable", callback);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) callback(value[i], i, value);
  } else {
    for (const k of Object.keys(value)) callback(value[k], k, value);
  }
}


// -------------------------
// PHP array pointer helpers
// -------------------------

/** @type {WeakMap<object, number>} */
const __arrayPointer = new WeakMap();

function __keysOf(value) {
  return Array.isArray(value) ? value.map((_, i) => i) : Object.keys(value);
}

function __getPtr(value) {
  return __arrayPointer.get(value) ?? 0;
}
function __setPtr(value, idx) {
  __arrayPointer.set(value, idx);
  return idx;
}

/**
 * current — Return the current element in an array.
 * @see https://www.php.net/manual/en/function.current.php
 * @param {any[]|Record<string,any>} array
 * @returns {any|false}
 */
export function current(array) {
  assertArity("current", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("current", 1, "array", array);
  const keys = __keysOf(array);
  if (keys.length === 0) return false;
  const idx = Math.min(__getPtr(array), keys.length - 1);
  const k = keys[idx];
  return Array.isArray(array) ? array[k] : array[k];
}

/**
 * key — Fetch a key from an array.
 * @see https://www.php.net/manual/en/function.key.php
 * @param {any[]|Record<string,any>} array
 * @returns {string|number|null}
 */
export function key(array) {
  assertArity("key", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("key", 1, "array", array);
  const keys = __keysOf(array);
  if (keys.length === 0) return null;
  const idx = Math.min(__getPtr(array), keys.length - 1);
  return keys[idx] ?? null;
}

/**
 * next — Advance the internal array pointer of an array.
 * @see https://www.php.net/manual/en/function.next.php
 * @param {any[]|Record<string,any>} array
 * @returns {any|false}
 */
export function next(array) {
  assertArity("next", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("next", 1, "array", array);
  const keys = __keysOf(array);
  if (keys.length === 0) return false;
  const idx = __setPtr(array, __getPtr(array) + 1);
  if (idx >= keys.length) return false;
  const k = keys[idx];
  return Array.isArray(array) ? array[k] : array[k];
}

/**
 * prev — Rewind the internal array pointer.
 * @see https://www.php.net/manual/en/function.prev.php
 * @param {any[]|Record<string,any>} array
 * @returns {any|false}
 */
export function prev(array) {
  assertArity("prev", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("prev", 1, "array", array);
  const keys = __keysOf(array);
  if (keys.length === 0) return false;
  const idx = __setPtr(array, __getPtr(array) - 1);
  if (idx < 0) return false;
  const k = keys[idx];
  return Array.isArray(array) ? array[k] : array[k];
}

/**
 * reset — Set the internal pointer of an array to its first element.
 * @see https://www.php.net/manual/en/function.reset.php
 * @param {any[]|Record<string,any>} array
 * @returns {any|false}
 */
export function reset(array) {
  assertArity("reset", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("reset", 1, "array", array);
  const keys = __keysOf(array);
  if (keys.length === 0) return false;
  __setPtr(array, 0);
  const k = keys[0];
  return Array.isArray(array) ? array[k] : array[k];
}

/**
 * end — Set the internal pointer of an array to its last element.
 * @see https://www.php.net/manual/en/function.end.php
 * @param {any[]|Record<string,any>} array
 * @returns {any|false}
 */
export function end(array) {
  assertArity("end", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("end", 1, "array", array);
  const keys = __keysOf(array);
  if (keys.length === 0) return false;
  __setPtr(array, keys.length - 1);
  const k = keys[keys.length - 1];
  return Array.isArray(array) ? array[k] : array[k];
}

// -------------------------
// Additional PHP array funcs
// -------------------------

/**
 * array_replace — Replaces elements from passed arrays into the first array.
 * @see https://www.php.net/manual/en/function.array-replace.php
 * @param {any[]|Record<string,any>} array
 * @param  {...(any[]|Record<string,any>)} replacements
 * @returns {any[]|Record<string,any>}
 */
export function array_replace(array, ...replacements) {
  assertArity("array_replace", arguments, 1, Infinity);
  if (!isArrayOrObject(array)) typeError("array_replace", 1, "array", array);
  const isArr = Array.isArray(array);
  const out = isArr ? [...array] : { ...array };
  for (let i = 0; i < replacements.length; i++) {
    const r = replacements[i];
    if (!isArrayOrObject(r)) typeError("array_replace", i + 2, "array", r);
    if (isArr) {
      const keys = __keysOf(r);
      for (const k of keys) out[k] = r[k];
    } else {
      for (const k of Object.keys(r)) out[k] = r[k];
    }
  }
  return out;
}

/**
 * array_replace_recursive — Replaces elements recursively.
 * @see https://www.php.net/manual/en/function.array-replace-recursive.php
 * @param {any[]|Record<string,any>} array
 * @param  {...(any[]|Record<string,any>)} replacements
 * @returns {any[]|Record<string,any>}
 */
export function array_replace_recursive(array, ...replacements) {
  assertArity("array_replace_recursive", arguments, 1, Infinity);
  if (!isArrayOrObject(array)) typeError("array_replace_recursive", 1, "array", array);

  const mergeRec = (a, b) => {
    const aIsArr = Array.isArray(a);
    const out = aIsArr ? [...a] : { ...a };
    const keys = aIsArr ? __keysOf(b) : Object.keys(b);
    for (const k of keys) {
      const av = out[k];
      const bv = b[k];
      if (isArrayOrObject(av) && isArrayOrObject(bv)) out[k] = mergeRec(av, bv);
      else out[k] = bv;
    }
    return out;
  };

  let out = Array.isArray(array) ? [...array] : { ...array };
  for (let i = 0; i < replacements.length; i++) {
    const r = replacements[i];
    if (!isArrayOrObject(r)) typeError("array_replace_recursive", i + 2, "array", r);
    out = mergeRec(out, r);
  }
  return out;
}

/**
 * array_diff_key — Computes the difference of arrays using keys for comparison.
 * @see https://www.php.net/manual/en/function.array-diff-key.php
 * @param {Record<string,any>|any[]} array
 * @param  {...(Record<string,any>|any[])} arrays
 * @returns {Record<string,any>|any[]}
 */
export function array_diff_key(array, ...arrays) {
  assertArity("array_diff_key", arguments, 2, Infinity);
  if (!isArrayOrObject(array)) typeError("array_diff_key", 1, "array", array);

  const baseKeys = new Set(__keysOf(array).map(String));
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    if (!isArrayOrObject(a)) typeError("array_diff_key", i + 2, "array", a);
    for (const k of __keysOf(a)) baseKeys.delete(String(k));
  }

  if (Array.isArray(array)) {
    const out = [];
    for (const k of __keysOf(array)) if (baseKeys.has(String(k))) out[k] = array[k];
    return out;
  }
  const out = {};
  for (const k of Object.keys(array)) if (baseKeys.has(String(k))) out[k] = array[k];
  return out;
}

/**
 * array_intersect_key — Computes the intersection of arrays using keys.
 * @see https://www.php.net/manual/en/function.array-intersect-key.php
 */
export function array_intersect_key(array, ...arrays) {
  assertArity("array_intersect_key", arguments, 2, Infinity);
  if (!isArrayOrObject(array)) typeError("array_intersect_key", 1, "array", array);

  let keys = new Set(__keysOf(array).map(String));
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    if (!isArrayOrObject(a)) typeError("array_intersect_key", i + 2, "array", a);
    const ks = new Set(__keysOf(a).map(String));
    keys = new Set([...keys].filter((k) => ks.has(k)));
  }

  if (Array.isArray(array)) {
    const out = [];
    for (const k of __keysOf(array)) if (keys.has(String(k))) out[k] = array[k];
    return out;
  }
  const out = {};
  for (const k of Object.keys(array)) if (keys.has(String(k))) out[k] = array[k];
  return out;
}

/**
 * array_intersect_assoc — Computes the intersection with additional index check.
 * @see https://www.php.net/manual/en/function.array-intersect-assoc.php
 */
export function array_intersect_assoc(array, ...arrays) {
  assertArity("array_intersect_assoc", arguments, 2, Infinity);
  if (!isArrayOrObject(array)) typeError("array_intersect_assoc", 1, "array", array);

  const out = Array.isArray(array) ? [] : {};
  const baseKeys = __keysOf(array);
  for (const k of baseKeys) {
    const v = array[k];
    let ok = true;
    for (let i = 0; i < arrays.length; i++) {
      const a = arrays[i];
      if (!isArrayOrObject(a)) typeError("array_intersect_assoc", i + 2, "array", a);
      if (!(String(k) in a) || a[k] !== v) {
        ok = false;
        break;
      }
    }
    if (ok) out[k] = v;
  }
  return out;
}

/**
 * array_walk_recursive — Apply a user function recursively.
 * @see https://www.php.net/manual/en/function.array-walk-recursive.php
 */
export function array_walk_recursive(array, callback, userdata) {
  assertArity("array_walk_recursive", arguments, 2, 3);
  if (!isArrayOrObject(array)) typeError("array_walk_recursive", 1, "array", array);
  if (typeof callback !== "function") typeError("array_walk_recursive", 2, "callable", callback);

  const walk = (val, key, container) => {
    if (isArrayOrObject(val)) {
      for (const k of __keysOf(val)) walk(val[k], k, val);
    } else callback(val, key, userdata);
  };

  for (const k of __keysOf(array)) walk(array[k], k, array);
  return true;
}

/**
 * array_multisort — Sort multiple arrays or a multidimensional array.
 * @see https://www.php.net/manual/en/function.array-multisort.php
 * @returns {boolean}
 */
export function array_multisort(...args) {
  // Minimal: supports array_multisort(array1, SORT_ASC|SORT_DESC?, SORT_REGULAR?)
  assertArity("array_multisort", arguments, 1, Infinity);
  const arrays = [];
  for (let i = 0; i < args.length; i++) {
    const v = args[i];
    if (isArrayOrObject(v)) arrays.push(v);
  }
  if (arrays.length === 0) typeError("array_multisort", 1, "array", args[0]);
  // Only handle first array ordering; apply same permutation to others
  const primary = arrays[0];
  if (!Array.isArray(primary)) typeError("array_multisort", 1, "array(list)", primary);

  // parse order (default ASC)
  const SORT_ASC = 4;
  const SORT_DESC = 3;
  let order = SORT_ASC;
  for (const v of args) if (v === SORT_DESC || v === SORT_ASC) order = v;

  const idx = primary.map((_, i) => i);
  idx.sort((a, b) => {
    const av = primary[a];
    const bv = primary[b];
    if (av === bv) return 0;
    const r = av < bv ? -1 : 1;
    return order === SORT_DESC ? -r : r;
  });

  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    const copy = arr.slice();
    for (let i = 0; i < idx.length; i++) arr[i] = copy[idx[i]];
  }
  return true;
}


// ---------------------------------------------------------------------------
// Additional PHP array parity (udiff/uintersect variants + array_is_list)
// ---------------------------------------------------------------------------

/**
 * array_is_list — Checks whether a given array is a list.
 * For JS arrays: true if indices are 0..n-1.
 * For objects: true if keys are "0".."n-1" with no gaps.
 * @see https://www.php.net/manual/en/function.array-is-list.php
 * @param {any[]|Record<string, any>} array
 * @returns {boolean}
 */
export function array_is_list(array) {
  assertArity("array_is_list", arguments, 1, 1);
  if (!isArrayOrObject(array)) typeError("array_is_list", 1, "array", array);
  const keys = Array.isArray(array) ? array.map((_, i) => String(i)) : Object.keys(array);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== String(i)) return false;
  }
  return true;
}

/**
 * array_diff_ukey — Computes the difference of arrays using a callback function on the keys for comparison.
 * @see https://www.php.net/manual/en/function.array-diff-ukey.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., key_compare_func)
 * @returns {Record<string, any>}
 */
export function array_diff_ukey(array, ...rest) {
  assertArity("array_diff_ukey", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_diff_ukey", 1, "array", array);
  const callback = rest.at(-1);
  if (typeof callback !== "function") typeError("array_diff_ukey", rest.length + 1, "callable", callback);
  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_diff_ukey", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;
  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const o of others) {
      for (const ok of Object.keys(o)) {
        if (callback(k, ok) === 0) continue outer;
      }
    }
    out[k] = v;
  }
  return out;
}

/**
 * array_diff_uassoc — Computes the difference of arrays with additional index check, compares values with a callback.
 * @see https://www.php.net/manual/en/function.array-diff-uassoc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {Record<string, any>}
 */
export function array_diff_uassoc(array, ...rest) {
  assertArity("array_diff_uassoc", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_diff_uassoc", 1, "array", array);
  const callback = rest.at(-1);
  if (typeof callback !== "function") typeError("array_diff_uassoc", rest.length + 1, "callable", callback);
  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_diff_uassoc", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;
  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const o of others) {
      if (Object.prototype.hasOwnProperty.call(o, k) && callback(v, o[k]) === 0) continue outer;
    }
    out[k] = v;
  }
  return out;
}

/**
 * array_udiff — Computes the difference of arrays by using a callback function for data comparison.
 * @see https://www.php.net/manual/en/function.array-udiff.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {any[]}
 */
export function array_udiff(array, ...rest) {
  assertArity("array_udiff", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_udiff", 1, "array", array);
  const callback = rest.at(-1);
  if (typeof callback !== "function") typeError("array_udiff", rest.length + 1, "callable", callback);
  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_udiff", i + 2, "array", a);
    return Array.isArray(a) ? a : Object.values(a);
  });
  const base = Array.isArray(array) ? array : Object.values(array);

  return base.filter((v) => {
    for (const o of others) {
      for (const ov of o) if (callback(v, ov) === 0) return false;
    }
    return true;
  });
}

/**
 * array_udiff_assoc — Computes the difference of arrays with additional index check; compares data with callback.
 * @see https://www.php.net/manual/en/function.array-udiff-assoc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {Record<string, any>}
 */
export function array_udiff_assoc(array, ...rest) {
  assertArity("array_udiff_assoc", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_udiff_assoc", 1, "array", array);
  const callback = rest.at(-1);
  if (typeof callback !== "function") typeError("array_udiff_assoc", rest.length + 1, "callable", callback);

  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_udiff_assoc", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;

  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const o of others) {
      if (Object.prototype.hasOwnProperty.call(o, k) && callback(v, o[k]) === 0) continue outer;
    }
    out[k] = v;
  }
  return out;
}

/**
 * array_udiff_uassoc — Computes the difference of arrays with additional index check;
 * compares data and keys by separate callback functions.
 * @see https://www.php.net/manual/en/function.array-udiff-uassoc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func, key_compare_func)
 * @returns {Record<string, any>}
 */
export function array_udiff_uassoc(array, ...rest) {
  assertArity("array_udiff_uassoc", arguments, 4);
  if (!isArrayOrObject(array)) typeError("array_udiff_uassoc", 1, "array", array);
  const keyCb = rest.at(-1);
  const valCb = rest.at(-2);
  if (typeof valCb !== "function") typeError("array_udiff_uassoc", rest.length, "callable", valCb);
  if (typeof keyCb !== "function") typeError("array_udiff_uassoc", rest.length + 1, "callable", keyCb);

  const others = rest.slice(0, -2).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_udiff_uassoc", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;

  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const o of others) {
      for (const ok of Object.keys(o)) {
        if (keyCb(k, ok) === 0 && valCb(v, o[ok]) === 0) continue outer;
      }
    }
    out[k] = v;
  }
  return out;
}

/**
 * array_intersect_ufunc — Computes the intersection of arrays, comparing data by a callback.
 * @see https://www.php.net/manual/en/function.array-intersect-ufunc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {any[]}
 */
export function array_intersect_ufunc(array, ...rest) {
  assertArity("array_intersect_ufunc", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_intersect_ufunc", 1, "array", array);
  const cb = rest.at(-1);
  if (typeof cb !== "function") typeError("array_intersect_ufunc", rest.length + 1, "callable", cb);
  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_intersect_ufunc", i + 2, "array", a);
    return Array.isArray(a) ? a : Object.values(a);
  });
  const base = Array.isArray(array) ? array : Object.values(array);
  return base.filter((v) => {
    for (const o of others) {
      let found = false;
      for (const ov of o) {
        if (cb(v, ov) === 0) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  });
}

/**
 * array_intersect_uassoc — Computes the intersection of arrays with additional index check,
 * compares values by callback.
 * @see https://www.php.net/manual/en/function.array-intersect-uassoc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {Record<string, any>}
 */
export function array_intersect_uassoc(array, ...rest) {
  assertArity("array_intersect_uassoc", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_intersect_uassoc", 1, "array", array);
  const cb = rest.at(-1);
  if (typeof cb !== "function") typeError("array_intersect_uassoc", rest.length + 1, "callable", cb);

  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_intersect_uassoc", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;

  /** @type {Record<string, any>} */
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    let ok = true;
    for (const o of others) {
      if (!Object.prototype.hasOwnProperty.call(o, k) || cb(v, o[k]) !== 0) { ok = false; break; }
    }
    if (ok) out[k] = v;
  }
  return out;
}

/**
 * array_intersect_ukey — Computes the intersection of arrays using a callback function on the keys for comparison.
 * @see https://www.php.net/manual/en/function.array-intersect-ukey.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., key_compare_func)
 * @returns {Record<string, any>}
 */
export function array_intersect_ukey(array, ...rest) {
  assertArity("array_intersect_ukey", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_intersect_ukey", 1, "array", array);
  const cb = rest.at(-1);
  if (typeof cb !== "function") typeError("array_intersect_ukey", rest.length + 1, "callable", cb);

  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_intersect_ukey", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;

  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const o of others) {
      let found = false;
      for (const ok of Object.keys(o)) {
        if (cb(k, ok) === 0) { found = true; break; }
      }
      if (!found) continue outer;
    }
    out[k] = v;
  }
  return out;
}

/**
 * array_uintersect — Computes the intersection of arrays by using a callback function for data comparison.
 * @see https://www.php.net/manual/en/function.array-uintersect.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {any[]}
 */
export function array_uintersect(array, ...rest) {
  assertArity("array_uintersect", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_uintersect", 1, "array", array);
  const cb = rest.at(-1);
  if (typeof cb !== "function") typeError("array_uintersect", rest.length + 1, "callable", cb);

  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_uintersect", i + 2, "array", a);
    return Array.isArray(a) ? a : Object.values(a);
  });
  const base = Array.isArray(array) ? array : Object.values(array);

  return base.filter((v) => {
    for (const o of others) {
      let found = false;
      for (const ov of o) if (cb(v, ov) === 0) { found = true; break; }
      if (!found) return false;
    }
    return true;
  });
}

/**
 * array_uintersect_assoc — Computes the intersection of arrays with additional index check,
 * compares data by callback.
 * @see https://www.php.net/manual/en/function.array-uintersect-assoc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func)
 * @returns {Record<string, any>}
 */
export function array_uintersect_assoc(array, ...rest) {
  assertArity("array_uintersect_assoc", arguments, 3);
  if (!isArrayOrObject(array)) typeError("array_uintersect_assoc", 1, "array", array);
  const cb = rest.at(-1);
  if (typeof cb !== "function") typeError("array_uintersect_assoc", rest.length + 1, "callable", cb);

  const others = rest.slice(0, -1).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_uintersect_assoc", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;

  /** @type {Record<string, any>} */
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    let ok = true;
    for (const o of others) {
      if (!Object.prototype.hasOwnProperty.call(o, k) || cb(v, o[k]) !== 0) { ok = false; break; }
    }
    if (ok) out[k] = v;
  }
  return out;
}

/**
 * array_uintersect_uassoc — Computes the intersection of arrays with additional index check,
 * compares data and keys by separate callback functions.
 * @see https://www.php.net/manual/en/function.array-uintersect-uassoc.php
 * @param {any[]|Record<string,any>} array
 * @param {...any} rest (array2, array3..., value_compare_func, key_compare_func)
 * @returns {Record<string, any>}
 */
export function array_uintersect_uassoc(array, ...rest) {
  assertArity("array_uintersect_uassoc", arguments, 4);
  if (!isArrayOrObject(array)) typeError("array_uintersect_uassoc", 1, "array", array);
  const keyCb = rest.at(-1);
  const valCb = rest.at(-2);
  if (typeof valCb !== "function") typeError("array_uintersect_uassoc", rest.length, "callable", valCb);
  if (typeof keyCb !== "function") typeError("array_uintersect_uassoc", rest.length + 1, "callable", keyCb);

  const others = rest.slice(0, -2).map((a, i) => {
    if (!isArrayOrObject(a)) typeError("array_uintersect_uassoc", i + 2, "array", a);
    return Array.isArray(a) ? Object.fromEntries(a.map((v, idx) => [String(idx), v])) : a;
  });
  const obj = Array.isArray(array) ? Object.fromEntries(array.map((v, idx) => [String(idx), v])) : array;

  /** @type {Record<string, any>} */
  const out = {};
  outer: for (const [k, v] of Object.entries(obj)) {
    for (const o of others) {
      let found = false;
      for (const ok of Object.keys(o)) {
        if (keyCb(k, ok) === 0 && valCb(v, o[ok]) === 0) { found = true; break; }
      }
      if (!found) continue outer;
    }
    out[k] = v;
  }
  return out;
}
