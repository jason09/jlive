/**
 * PHP-like math functions.
 * @module php/math
 */

import { assertArity, assertNumber, typeError } from "../internal/assert.js";

export function abs(num) {
  assertArity("abs", arguments, 1, 1);
  if (typeof num !== "number") typeError("abs", 1, "number", num);
  return Math.abs(num);
}

/**
 * PHP rand() - simple wrapper.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function rand(min = 0, max = 32767) {
  assertArity("rand", arguments, 0, 2);
  if (typeof min !== "number") typeError("rand", 1, "int", min);
  if (typeof max !== "number") typeError("rand", 2, "int", max);
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// existing
export function hexdec(hexString) {
  assertArity("hexdec", arguments, 1, 1);
  if (typeof hexString !== "string" && typeof hexString !== "number") typeError("hexdec", 1, "string", hexString);
  return parseInt(String(hexString), 16);
}

export function dechex(num) {
  assertArity("dechex", arguments, 1, 1);
  if (typeof num !== "number") typeError("dechex", 1, "int", num);
  return Math.trunc(num).toString(16);
}

export function bin2hex(str) {
  assertArity("bin2hex", arguments, 1, 1);
  if (typeof str !== "string") typeError("bin2hex", 1, "string", str);
  return Buffer.from(str, "utf8").toString("hex");
}

export function log(arg, base = Math.E) {
  assertArity("log", arguments, 1, 2);
  if (typeof arg !== "number") typeError("log", 1, "number", arg);
  if (typeof base !== "number") typeError("log", 2, "number", base);
  return Math.log(arg) / Math.log(base);
}

// --- New (>=10) ---

export function ceil(num) {
  assertArity("ceil", arguments, 1, 1);
  assertNumber("ceil", 1, num);
  return Math.ceil(num);
}

export function floor(num) {
  assertArity("floor", arguments, 1, 1);
  assertNumber("floor", 1, num);
  return Math.floor(num);
}

export function round(num, precision = 0, mode = 1) {
  assertArity("round", arguments, 1, 3);
  assertNumber("round", 1, num);
  if (typeof precision !== "number") typeError("round", 2, "int", precision);
  const p = 10 ** Math.trunc(precision);
  const n = num * p;
  // PHP modes: 1=HALF_UP, 2=HALF_DOWN, 3=HALF_EVEN, 4=HALF_ODD (simplified)
  const frac = n - Math.trunc(n);
  let r;
  if (Math.abs(frac) !== 0.5) r = Math.round(n);
  else {
    const sign = Math.sign(n) || 1;
    const absN = Math.abs(n);
    const base = Math.floor(absN);
    const isEven = base % 2 === 0;
    switch (mode) {
      case 2: // HALF_DOWN
        r = sign * base;
        break;
      case 3: // HALF_EVEN
        r = sign * (isEven ? base : base + 1);
        break;
      case 4: // HALF_ODD
        r = sign * (isEven ? base + 1 : base);
        break;
      default: // HALF_UP
        r = sign * (base + 1);
    }
  }
  return r / p;
}

export function min(...values) {
  assertArity("min", arguments, 1);
  if (values.length === 1 && Array.isArray(values[0])) values = values[0];
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== "number") typeError("min", i + 1, "number", values[i]);
  }
  return Math.min(...values);
}

export function max(...values) {
  assertArity("max", arguments, 1);
  if (values.length === 1 && Array.isArray(values[0])) values = values[0];
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== "number") typeError("max", i + 1, "number", values[i]);
  }
  return Math.max(...values);
}

export function pow(base, exp) {
  assertArity("pow", arguments, 2, 2);
  assertNumber("pow", 1, base);
  assertNumber("pow", 2, exp);
  return base ** exp;
}

export function sqrt(num) {
  assertArity("sqrt", arguments, 1, 1);
  assertNumber("sqrt", 1, num);
  return Math.sqrt(num);
}

export function intdiv(dividend, divisor) {
  assertArity("intdiv", arguments, 2, 2);
  assertNumber("intdiv", 1, dividend);
  assertNumber("intdiv", 2, divisor);
  if (divisor === 0) throw new RangeError("Division by zero");
  return Math.trunc(dividend / divisor);
}

export function base_convert(number, fromBase, toBase) {
  assertArity("base_convert", arguments, 3, 3);
  if (typeof number !== "string") typeError("base_convert", 1, "string", number);
  if (typeof fromBase !== "number") typeError("base_convert", 2, "int", fromBase);
  if (typeof toBase !== "number") typeError("base_convert", 3, "int", toBase);
  const n = parseInt(number, fromBase);
  if (!Number.isFinite(n)) return "0";
  return n.toString(toBase);
}

export function decbin(num) {
  assertArity("decbin", arguments, 1, 1);
  if (typeof num !== "number") typeError("decbin", 1, "int", num);
  return Math.trunc(num).toString(2);
}

export function bindec(binString) {
  assertArity("bindec", arguments, 1, 1);
  if (typeof binString !== "string" && typeof binString !== "number") typeError("bindec", 1, "string", binString);
  return parseInt(String(binString), 2);
}

// --- Extended parity: fmod / trig / hyperbolic / exp-log / random / constants ---

/**
 * PHP fmod() — Returns the floating point remainder of dividing the dividend by the divisor.
 * @see https://www.php.net/manual/en/function.fmod.php
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
export function fmod(x, y) {
  assertArity("fmod", arguments, 2, 2);
  assertNumber("fmod", 1, x);
  assertNumber("fmod", 2, y);
  return x % y;
}

/** @see https://www.php.net/manual/en/function.pi.php */
export function pi() {
  assertArity("pi", arguments, 0, 0);
  return Math.PI;
}

/** @see https://www.php.net/manual/en/function.hypot.php */
export function hypot(x, y) {
  assertArity("hypot", arguments, 2, 2);
  assertNumber("hypot", 1, x);
  assertNumber("hypot", 2, y);
  return Math.hypot(x, y);
}

/** @see https://www.php.net/manual/en/function.sin.php */
export function sin(num) {
  assertArity("sin", arguments, 1, 1);
  assertNumber("sin", 1, num);
  return Math.sin(num);
}
/** @see https://www.php.net/manual/en/function.cos.php */
export function cos(num) {
  assertArity("cos", arguments, 1, 1);
  assertNumber("cos", 1, num);
  return Math.cos(num);
}
/** @see https://www.php.net/manual/en/function.tan.php */
export function tan(num) {
  assertArity("tan", arguments, 1, 1);
  assertNumber("tan", 1, num);
  return Math.tan(num);
}
/** @see https://www.php.net/manual/en/function.asin.php */
export function asin(num) {
  assertArity("asin", arguments, 1, 1);
  assertNumber("asin", 1, num);
  return Math.asin(num);
}
/** @see https://www.php.net/manual/en/function.acos.php */
export function acos(num) {
  assertArity("acos", arguments, 1, 1);
  assertNumber("acos", 1, num);
  return Math.acos(num);
}
/** @see https://www.php.net/manual/en/function.atan.php */
export function atan(num) {
  assertArity("atan", arguments, 1, 1);
  assertNumber("atan", 1, num);
  return Math.atan(num);
}
/** @see https://www.php.net/manual/en/function.atan2.php */
export function atan2(y, x) {
  assertArity("atan2", arguments, 2, 2);
  assertNumber("atan2", 1, y);
  assertNumber("atan2", 2, x);
  return Math.atan2(y, x);
}

/** @see https://www.php.net/manual/en/function.sinh.php */
export function sinh(num) {
  assertArity("sinh", arguments, 1, 1);
  assertNumber("sinh", 1, num);
  return Math.sinh(num);
}
/** @see https://www.php.net/manual/en/function.cosh.php */
export function cosh(num) {
  assertArity("cosh", arguments, 1, 1);
  assertNumber("cosh", 1, num);
  return Math.cosh(num);
}
/** @see https://www.php.net/manual/en/function.tanh.php */
export function tanh(num) {
  assertArity("tanh", arguments, 1, 1);
  assertNumber("tanh", 1, num);
  return Math.tanh(num);
}
/** @see https://www.php.net/manual/en/function.asinh.php */
export function asinh(num) {
  assertArity("asinh", arguments, 1, 1);
  assertNumber("asinh", 1, num);
  return Math.asinh(num);
}
/** @see https://www.php.net/manual/en/function.acosh.php */
export function acosh(num) {
  assertArity("acosh", arguments, 1, 1);
  assertNumber("acosh", 1, num);
  return Math.acosh(num);
}
/** @see https://www.php.net/manual/en/function.atanh.php */
export function atanh(num) {
  assertArity("atanh", arguments, 1, 1);
  assertNumber("atanh", 1, num);
  return Math.atanh(num);
}

/** @see https://www.php.net/manual/en/function.deg2rad.php */
export function deg2rad(num) {
  assertArity("deg2rad", arguments, 1, 1);
  assertNumber("deg2rad", 1, num);
  return (num * Math.PI) / 180;
}
/** @see https://www.php.net/manual/en/function.rad2deg.php */
export function rad2deg(num) {
  assertArity("rad2deg", arguments, 1, 1);
  assertNumber("rad2deg", 1, num);
  return (num * 180) / Math.PI;
}

/** @see https://www.php.net/manual/en/function.exp.php */
export function exp(num) {
  assertArity("exp", arguments, 1, 1);
  assertNumber("exp", 1, num);
  return Math.exp(num);
}
/** @see https://www.php.net/manual/en/function.expm1.php */
export function expm1(num) {
  assertArity("expm1", arguments, 1, 1);
  assertNumber("expm1", 1, num);
  return Math.expm1(num);
}
/** @see https://www.php.net/manual/en/function.log10.php */
export function log10(num) {
  assertArity("log10", arguments, 1, 1);
  assertNumber("log10", 1, num);
  return Math.log10(num);
}
/** @see https://www.php.net/manual/en/function.log1p.php */
export function log1p(num) {
  assertArity("log1p", arguments, 1, 1);
  assertNumber("log1p", 1, num);
  return Math.log1p(num);
}

/** @see https://www.php.net/manual/en/function.is-finite.php */
export function is_finite(num) {
  assertArity("is_finite", arguments, 1, 1);
  assertNumber("is_finite", 1, num);
  return Number.isFinite(num);
}
/** @see https://www.php.net/manual/en/function.is-infinite.php */
export function is_infinite(num) {
  assertArity("is_infinite", arguments, 1, 1);
  assertNumber("is_infinite", 1, num);
  return !Number.isFinite(num);
}
/** @see https://www.php.net/manual/en/function.is-nan.php */
export function is_nan(num) {
  assertArity("is_nan", arguments, 1, 1);
  assertNumber("is_nan", 1, num);
  return Number.isNaN(num);
}

/**
 * PHP lcg_value() — Pseudo-random number in the range (0, 1).
 * @see https://www.php.net/manual/en/function.lcg-value.php
 */
export function lcg_value() {
  assertArity("lcg_value", arguments, 0, 0);
  return Math.random();
}

// --- mt_* (Mersenne Twister in PHP). Node doesn't expose MT; we provide a deterministic PRNG with the same API shape. ---
let __mt_state = 0x12345678 >>> 0;

/**
 * PHP mt_srand() — Seed the generator.
 * @see https://www.php.net/manual/en/function.mt-srand.php
 * @param {number} [seed]
 * @returns {void}
 */
export function mt_srand(seed = Date.now()) {
  assertArity("mt_srand", arguments, 0, 1);
  if (typeof seed !== "number") typeError("mt_srand", 1, "int", seed);
  __mt_state = (Math.trunc(seed) >>> 0) || 0x12345678;
}

/** @see https://www.php.net/manual/en/function.mt-getrandmax.php */
export function mt_getrandmax() {
  assertArity("mt_getrandmax", arguments, 0, 0);
  // Keep PHP's typical max value (2^31-1)
  return 0x7fffffff;
}

function __mt_next_u31() {
  // xorshift32 -> 31-bit positive int
  let x = __mt_state >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  __mt_state = x >>> 0;
  return (x & 0x7fffffff) >>> 0;
}

/**
 * PHP mt_rand() — Better random values (API-compatible).
 * @see https://www.php.net/manual/en/function.mt-rand.php
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number}
 */
export function mt_rand(min = 0, max = mt_getrandmax()) {
  assertArity("mt_rand", arguments, 0, 2);
  if (typeof min !== "number") typeError("mt_rand", 1, "int", min);
  if (typeof max !== "number") typeError("mt_rand", 2, "int", max);
  if (max < min) [min, max] = [max, min];
  const span = Math.trunc(max - min + 1);
  const r = __mt_next_u31() % span;
  return Math.trunc(min + r);
}
