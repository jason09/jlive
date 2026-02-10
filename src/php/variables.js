/**
 * PHP-like variable / type / debug helpers.
 * @module php/variables
 */

import { assertArity, assertArray, assertBoolean, assertNumber, assertObject, assertString, phpType, typeError } from "../internal/assert.js";

/**
 * Returns true if value is an array.
 * @param {any} value
 * @returns {value is any[]}
 */
export function is_array(value) {
  return Array.isArray(value);
}

/**
 * Returns true if value is an object (and not null/array).
 * @param {any} value
 * @returns {value is Record<string, any>}
 */
export function is_object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Returns true if value is numeric or a numeric string.
 * @param {any} value
 * @returns {boolean}
 */
export function is_numeric(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  if (value.trim() === "") return false;
  return Number.isFinite(Number(value));
}

/**
 * PHP-like empty(): true for "", 0, 0.0, "0", null, undefined, false, [], {}.
 * @param {any} value
 * @returns {boolean}
 */
export function empty(value) {
  if (value === null || value === undefined) return true;
  if (value === false) return true;
  if (value === 0 || value === 0.0) return true;
  if (value === "" || value === "0") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * PHP-like isset(): returns false if any argument is undefined or null.
 * @param  {...any} values
 * @returns {boolean}
 */
export function isset(...values) {
  if (values.length === 0) return false;
  for (const v of values) {
    if (v === null || v === undefined) return false;
  }
  return true;
}

/**
 * Returns a PHP-like type string.
 * @param {any} value
 * @returns {string}
 */
export function gettype(value) {
  const t = phpType(value);
  if (t === "array") return "array";
  if (t === "date") return "object";
  if (t === "regexp") return "object";
  if (t === "null") return "NULL";
  if (t === "boolean") return "boolean";
  if (t === "number") return "double";
  if (t === "string") return "string";
  if (t === "function") return "object";
  return "object";
}

/**
 * Casts a value to a given type (PHP-like).
 * @param {any} value
 * @param {string} type
 * @returns {any}
 */
export function settype(value, type) {
  assertArity("settype", arguments, 2, 2);
  assertString("settype", 2, type);
  switch (type) {
    case "string":
      return String(value);
    case "integer":
    case "int":
      return parseInt(String(value || "0"), 10) || 0;
    case "float":
    case "double":
      return Number.parseFloat(String(value || "0")) || 0;
    case "boolean":
    case "bool":
      return boolval(value);
    case "array":
      return Array.isArray(value) ? value : [value];
    case "object":
      return is_object(value) ? value : { scalar: value };
    default:
      throw new TypeError(`Warning: settype() type '${type}' is not supported`);
  }
}

/**
 * Converts a value to boolean following PHP-ish semantics.
 * @param {any} value
 * @returns {boolean}
 */
export function boolval(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "" || s === "0" || s === "false" || s === "null") return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
}

/**
 * Converts a value to int (PHP-like).
 * @param {any} value
 * @param {number} [base]
 * @returns {number}
 */
export function intval(value, base = 10) {
  assertArity("intval", arguments, 1, 2);
  if (base !== undefined) {
    if (typeof base !== "number") typeError("intval", 2, "int", base);
  }
  if (typeof value === "number") return (value | 0);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const n = parseInt(value, base);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Converts a value to float.
 * @param {any} value
 * @returns {number}
 */
export function floatval(value) {
  assertArity("floatval", arguments, 1, 1);
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Converts a value to string.
 * @param {any} value
 * @returns {string}
 */
export function strval(value) {
  assertArity("strval", arguments, 1, 1);
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "";
  if (typeof value === "bigint") return value.toString(10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * PHP-like var_dump() formatting (returns string).
 * @param  {...any} values
 * @returns {string}
 */
export function var_dump(...values) {
  const out = [];
  for (const v of values) out.push(_dump(v, 0));
  return out.join("\n");
}

/**
 * PHP-like print_r() formatting (returns string).
 * @param {any} value
 * @param {boolean} [returnOutput=false]
 * @returns {string|true}
 */
export function print_r(value, returnOutput = false) {
  const s = _print(value, 0);
  return returnOutput ? s : (console.log(s), true);
}

/**
 * PHP-like debug helper to check if value is a function.
 * @param {any} value
 * @returns {boolean}
 */
export function isFunction(value) {
  return typeof value === "function";
}

/**
 * Returns true if value is scalar (bool/int/float/string).
 * @param {any} value
 * @returns {boolean}
 */
export function is_scalar(value) {
  const t = typeof value;
  return t === "boolean" || t === "number" || t === "string";
}

/** @param {any} v @returns {boolean} */
export function is_string(v) {
  return typeof v === "string";
}

/** @param {any} v @returns {boolean} */
export function is_int(v) {
  return typeof v === "number" && Number.isInteger(v);
}

/** @param {any} v @returns {boolean} */
export function is_float(v) {
  return typeof v === "number" && Number.isFinite(v) && !Number.isInteger(v);
}

/** @param {any} v @returns {boolean} */
export function is_bool(v) {
  return typeof v === "boolean";
}

/** @param {any} v @returns {boolean} */
export function is_null(v) {
  return v === null;
}

/**
 * @param {any} value
 * @param {number} depth
 */
function _dump(value, depth) {
  const indent = "  ".repeat(depth);
  const t = phpType(value);
  switch (t) {
    case "null":
      return `${indent}NULL`;
    case "undefined":
      return `${indent}NULL`;
    case "boolean":
      return `${indent}bool(${value ? "true" : "false"})`;
    case "number":
      return `${indent}${Number.isInteger(value) ? "int" : "float"}(${value})`;
    case "string":
      return `${indent}string(${value.length}) "${value}"`;
    case "array": {
      let s = `${indent}array(${value.length}) {`;
      for (let i = 0; i < value.length; i++) {
        s += `\n${indent}  [${i}]=>\n${_dump(value[i], depth + 2)}`;
      }
      return s + `\n${indent}}`;
    }
    case "object": {
      const keys = Object.keys(value);
      let s = `${indent}object(${value?.constructor?.name ?? "Object"}) (${keys.length}) {`;
      for (const k of keys) {
        s += `\n${indent}  ["${k}"]=>\n${_dump(value[k], depth + 2)}`;
      }
      return s + `\n${indent}}`;
    }
    default:
      return `${indent}${String(value)}`;
  }
}

function _print(value, depth) {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    let s = `${indent}Array\n${indent}(\n`;
    for (let i = 0; i < value.length; i++) {
      s += `${indent}  [${i}] => ${_print(value[i], depth + 1).trimStart()}\n`;
    }
    return s + `${indent})\n`;
  }
  if (value && typeof value === "object") {
    let s = `${indent}${value?.constructor?.name ?? "Object"}\n${indent}(\n`;
    for (const k of Object.keys(value)) {
      s += `${indent}  [${k}] => ${_print(value[k], depth + 1).trimStart()}\n`;
    }
    return s + `${indent})\n`;
  }
  return `${indent}${String(value)}\n`;
}
