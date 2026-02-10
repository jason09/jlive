/**
 * PHP-like JSON functions.
 * @module php/json
 */

import { assertArity, assertBoolean, assertString, typeError } from "../internal/assert.js";

/**
 * json_encode.
 * @param {any} value
 * @param {number} [options=0]
 * @param {number} [depth=512]
 * @returns {string|false}
 */
export function json_encode(value, options = 0, depth = 512) {
  assertArity("json_encode", arguments, 1, 3);
  if (typeof options !== "number") typeError("json_encode", 2, "int", options);
  if (typeof depth !== "number") typeError("json_encode", 3, "int", depth);
  try {
    return JSON.stringify(value);
  } catch {
    return false;
  }
}

/**
 * json_decode.
 * @param {string} json
 * @param {boolean} [assoc=false]
 * @param {number} [depth=512]
 * @param {number} [options=0]
 * @returns {any|null}
 */
export function json_decode(json, assoc = false, depth = 512, options = 0) {
  assertArity("json_decode", arguments, 1, 4);
  assertString("json_decode", 1, json);
  if (typeof assoc !== "boolean") typeError("json_decode", 2, "bool", assoc);
  if (typeof depth !== "number") typeError("json_decode", 3, "int", depth);
  if (typeof options !== "number") typeError("json_decode", 4, "int", options);
  try {
    const v = JSON.parse(json);
    // assoc is no-op in JS (objects are associative by default)
    return v;
  } catch {
    return null;
  }
}
