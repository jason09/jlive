/**
 * Chainable wrapper around PHP-compatible functions.
 * Auto-generates chain methods from modules using chain.config.js
 * while skipping functions that are not safe/meaningful to chain.
 *
 * @module chain
 */

import { INJECT_LAST, CHAIN_RULES, CHAIN_INJECTION } from "./chain.config.js";

// Static imports (so bundlers + tree-shaking remain friendly for direct module use)
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

  // You can keep hand-written DX methods here if you want.
  // If you leave them out, auto-gen will still create the methods.
  
  /** @returns {Chain<string>} */
  //trim() { return new Chain(S.trim(/** @type {any} */ (this._v))); }

  /** @param {string} needle @returns {Chain<boolean>} */
  //contains(needle) { return new Chain(S.strpos(/** @type {any} */ (this._v), needle) !== false); }

  /** @returns {Chain<string>} */
  //strtolower() { return new Chain(S.strtolower(/** @type {any} */ (this._v))); }

  /** @returns {Chain<string>} */
  //strtoupper() { return new Chain(S.strtoupper(/** @type {any} */ (this._v))); }

  /** @param {number} start @param {number} [length] @returns {Chain<string>} */
  //substr(start, length) { return new Chain(S.substr(/** @type {any} */ (this._v), start, length)); }

  /** @param {string} search @param {string} replace @returns {Chain<string>} */
  //replace(search, replace) { return new Chain(S.str_replace(search, replace, /** @type {any} */ (this._v))); }

  /** @param {(v:any,k:any)=>boolean} callback @returns {Chain<any>} */
  //filter(callback) { return new Chain(A.array_filter(/** @type {any} */ (this._v), callback)); }

  /** @param {(v:any,k:any)=>any} callback @returns {Chain<any>} */
  //map(callback) { return new Chain(A.array_map(callback, /** @type {any} */ (this._v))); }

  /** @param {any} [initial] @returns {Chain<any>} */
  //sum(initial) { return new Chain(A.array_sum(/** @type {any} */ (this._v)) + (initial ?? 0)); }

  /** @returns {Chain<number>} */
  //count() { return new Chain(A.count(/** @type {any} */ (this._v))); }

  /** @returns {Chain<string|false>} */
  //json_encode() { return new Chain(J.json_encode(this._v)); }

  /** @returns {Chain<any>} */
  //json_decode() { return new Chain(J.json_decode(/** @type {any} */ (this._v))); }

  /** @returns {Chain<string|Uint8Array>} */
  //sha256() { return new Chain(C.sha256(String(this._v))); }
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

/**
 * All modules (useful for advanced usage/extensions).
 * Exported even if skipped for auto-chain.
 */
export const modules = Object.freeze({ V, S, A, M, D, J, C, P, Z, L, N, K, X, F });

/* -------------------------------------------------------------------------- */
/*                           AUTO-GENERATED METHODS                           */
/* -------------------------------------------------------------------------- */

/**
 * Adds chain methods for module exports.
 * It will NOT overwrite existing Chain.prototype methods.
 * @param {object} mod
 * @param {"first"|"last"} defaultInject
 * @param {Set<string>} skip
 */
function addChainMethods(mod, defaultInject, skip) {
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn !== "function") continue;
    if (name.startsWith("_")) continue;
    if (skip?.has(name)) continue;

    // Don't overwrite manual methods
    if (Object.prototype.hasOwnProperty.call(Chain.prototype, name)) continue;

    const spec = CHAIN_INJECTION?.[name];

    Object.defineProperty(Chain.prototype, name, {
      enumerable: false,
      configurable: false,
      writable: false,
      /**
       * @this {Chain<any>}
       * @param  {...any} args
       * @returns {Chain<any>}
       */
      value: function (...args) {
        // 1) Fine-grained injection overrides
        if (spec) {
          const baseArgs = typeof spec.normalizeArgs === "function" ? spec.normalizeArgs(args) : args;

          // inject index: 0..n or -1 (last)
          const idx = Number(spec.inject);
          const callArgs = baseArgs.slice();

          if (Number.isNaN(idx)) {
            throw new Error(`Chain injection config error for "${name}": inject must be a number`);
          }

          if (idx === -1) {
            callArgs.push(this._v);
          } else if (idx <= 0) {
            callArgs.unshift(this._v);
          } else if (idx >= callArgs.length) {
            // if idx is beyond current args, pad until position
            while (callArgs.length < idx) callArgs.push(undefined);
            callArgs.splice(idx, 0, this._v);
          } else {
            callArgs.splice(idx, 0, this._v);
          }

          return new Chain(fn(...callArgs));
        }

        // 2) Simple first/last injection
        const inject = INJECT_LAST.has(name) ? "last" : defaultInject;
        const out = inject === "first" ? fn(this._v, ...args) : fn(...args, this._v);
        return new Chain(out);
      },
    });
  }
}


/**
 * Map namespace key -> actual imported module object.
 * This lets chain.config.js stay generator-friendly (ns/path) while runtime uses real modules.
 */
const NS_TO_MODULE = Object.freeze({ V, S, A, M, D, J, C, P, Z, L, N, K, X, F });

// Apply generation based on config
for (const rule of CHAIN_RULES) {
  const mod = NS_TO_MODULE[rule.ns];
  if (!mod) continue; // ignore unknown ns
  addChainMethods(mod, rule.defaultInject, rule.skip);
}

/**
 * Nice alias: chain(value).foreach(callback)
 * Uses A.foreach_ under the hood (JS keyword safe) if present.
 */
if (!Object.prototype.hasOwnProperty.call(Chain.prototype, "foreach") && typeof A.foreach_ === "function") {
  Object.defineProperty(Chain.prototype, "foreach", {
    enumerable: false,
    configurable: false,
    writable: false,
    /**
     * @this {Chain<any>}
     * @param {(v:any,k:any)=>any} callback
     * @returns {Chain<any>}
     */
    value: function (callback) {
      const out = A.foreach_(this._v, callback);
      return new Chain(out);
    },
  });
}
