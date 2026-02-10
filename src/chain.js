/**
 * Chainable wrapper around JlivePHP functions.
 * @module chain
 */

import * as V from "./php/variables.js";
import * as S from "./php/string.js";
import * as A from "./php/array.js";
import * as M from "./php/math.js";
import * as D from "./php/date.js";
import * as J from "./php/json.js";
import * as C from "./php/crypto.js";
import * as P from "./php/preg.js";
import * as Z from "./php/serialize.js";
import * as L from "./php/locale.js";
import * as N from "./php/network.js";
import * as K from "./php/cookie.js";
import * as X from "./php/session.js";
import * as F from "./php/file.js";

/**
 * @template T
 */
export class Chain {
  /** @param {T} value */
  constructor(value) {
    /** @type {T} */
    this._v = value;
  }

  /**
   * Unwrap the current value.
   * @returns {T}
   */
  value() {
    return this._v;
  }

  /**
   * Run a side-effect with the current value.
   * @param {(v:T)=>void} fn
   * @returns {Chain<T>}
   */
  tap(fn) {
    fn(this._v);
    return this;
  }

  // --- String methods ---
  /** @returns {Chain<string>} */
  trim() { return new Chain(S.trim(/** @type {any} */ (this._v))); }
  /** @param {string} needle @returns {Chain<boolean>} */
  contains(needle) { return new Chain(S.strpos(/** @type {any} */ (this._v), needle) !== false); }
  /** @returns {Chain<string>} */
  strtolower() { return new Chain(S.strtolower(/** @type {any} */ (this._v))); }
  /** @returns {Chain<string>} */
  strtoupper() { return new Chain(S.strtoupper(/** @type {any} */ (this._v))); }
  /** @param {number} start @param {number} [length] @returns {Chain<string>} */
  substr(start, length) { return new Chain(S.substr(/** @type {any} */ (this._v), start, length)); }
  /** @param {string} search @param {string} replace @returns {Chain<string>} */
  replace(search, replace) { return new Chain(S.str_replace(search, replace, /** @type {any} */ (this._v))); }

  // --- Array/Object methods ---
  /** @param {(v:any,k:any)=>boolean} callback @returns {Chain<any>} */
  filter(callback) { return new Chain(A.array_filter(/** @type {any} */ (this._v), callback)); }
  /** @param {(v:any,k:any)=>any} callback @returns {Chain<any>} */
  map(callback) { return new Chain(A.array_map(callback, /** @type {any} */ (this._v))); }
  /** @param {any} [initial] @returns {Chain<any>} */
  sum(initial) { return new Chain(A.array_sum(/** @type {any} */ (this._v)) + (initial ?? 0)); }
  /** @returns {Chain<number>} */
  count() { return new Chain(A.count(/** @type {any} */ (this._v))); }

  // --- JSON ---
  /** @returns {Chain<string|false>} */
  json_encode() { return new Chain(J.json_encode(this._v)); }
  /** @returns {Chain<any>} */
  json_decode() { return new Chain(J.json_decode(/** @type {any} */ (this._v))); }

  // --- Crypto ---
  /** @returns {Chain<string|Uint8Array>} */
  sha256() { return new Chain(C.sha256(String(this._v))); }
}

/**
 * Create a chain wrapper.
 * @template T
 * @param {T} value
 * @returns {Chain<T>}
 */
export function chain(value) {
  return new Chain(value);
}

/** Convenience namespace with all functions (for chaining extensions). */
export const modules = Object.freeze({ V, S, A, M, D, J, C, F });
