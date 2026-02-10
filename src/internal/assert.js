/**
 * Internal helpers for runtime validation and PHP-like error messages.
 * @module internal/assert
 */

/**
 * @typedef {"null"|"undefined"|"boolean"|"number"|"string"|"function"|"array"|"object"|"date"|"regexp"|"bigint"|"symbol"} PhpType
 */

/** @param {any} v @returns {PhpType} */
export function phpType(v) {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return "array";
  if (v instanceof Date) return "date";
  if (v instanceof RegExp) return "regexp";
  const t = typeof v;
  if (t === "object") return "object";
  return /** @type {PhpType} */ (t);
}

/**
 * @param {string} fn
 * @param {number} idx
 * @param {string} expected
 * @param {any} got
 */
export function typeError(fn, idx, expected, got) {
  const given = phpType(got);
  throw new TypeError(`Warning: ${fn}() expects parameter ${idx} to be ${expected}, ${given} given`);
}

/**
 * @param {string} fn
 * @param {string} message
 */
export function argError(fn, message) {
  throw new TypeError(`Warning: ${fn}() ${message}`);
}

/**
 * @param {string} fn
 * @param {IArguments|any[]} args
 * @param {number} min
 * @param {number} [max]
 */
export function assertArity(fn, args, min, max = Infinity) {
  const n = args.length;
  if (n < min) {
    throw new TypeError(`Warning: ${fn}() expects at least ${min} parameter${min === 1 ? "" : "s"}, ${n} given`);
  }
  if (n > max) {
    throw new TypeError(`Warning: ${fn}() expects at most ${max} parameter${max === 1 ? "" : "s"}, ${n} given`);
  }
}

/**
 * @param {string} fn
 * @param {number} idx
 * @param {any} v
 */
export function assertString(fn, idx, v) {
  if (typeof v !== "string") typeError(fn, idx, "string", v);
}

/**
 * @param {Directory} fn
 * @param {number} idx
 * @param {any} v
 */
export function assertDirectory(fn, idx, v) {
  if (!(v instanceof Directory)) typeError(fn, idx, "Directory", v);
}

/**
 * @param {string} fn
 * @param {number} idx
 * @param {any} v
 */
export function assertNumber(fn, idx, v) {
  if (typeof v !== "number" || Number.isNaN(v)) typeError(fn, idx, "number", v);
}

/**
 * @param {string} fn
 * @param {number} idx
 * @param {any} v
 */
export function assertArray(fn, idx, v) {
  if (!Array.isArray(v)) typeError(fn, idx, "array", v);
}

/**
 * @param {string} fn
 * @param {number} idx
 * @param {any} v
 */
export function assertObject(fn, idx, v) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) typeError(fn, idx, "object", v);
}

/**
 * @param {string} fn
 * @param {number} idx
 * @param {any} v
 */
export function assertBoolean(fn, idx, v) {
  if (typeof v !== "boolean") typeError(fn, idx, "bool", v);
}
