/**
 * PHP-like crypto / hashing helpers.
 * @module php/crypto
 */

import crypto from "node:crypto";
import { createRequire } from "node:module";

import { assertArity, assertBoolean, assertNumber, assertString } from "../internal/assert.js";

const require = createRequire(import.meta.url);

/**
 * NOT PHP
 * Generate a random string.
 * @param {number} [length=32]
 * @param {string} [alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"]
 * @returns {string}
 */
export function generate(
  length = 32,
  alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
) {
  assertArity("generate", arguments, 0, 2);
  if (length !== undefined && typeof length !== "number") throw new TypeError("Warning: generate() expects parameter 1 to be int, " + typeof length + " given");
  if (alphabet !== undefined) assertString("generate", 2, alphabet);
  if (length < 0 || !Number.isFinite(length)) throw new RangeError("Warning: generate() length must be a finite positive number");
  if (alphabet.length === 0) throw new RangeError("Warning: generate() alphabet must not be empty");
  // Node 20+ supports crypto.getRandomValues via webcrypto; crypto.randomBytes is still fastest.
  const bytes = crypto.randomBytes(Math.ceil(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * sha1(string)
 * @param {string} string
 * @param {boolean} [binary=false]
 * @returns {string|Uint8Array}
 */
export function sha1(string, binary = false) {
  assertArity("sha1", arguments, 1, 2);
  assertString("sha1", 1, string);
  if (binary !== undefined) assertBoolean("sha1", 2, binary);
  const h = crypto.createHash("sha1").update(string);
  return binary ? new Uint8Array(h.digest()) : h.digest("hex");
}

/**
 * sha256(string)
 * @param {string} string
 * @param {boolean} [binary=false]
 * @returns {string|Uint8Array}
 */
export function sha256(string, binary = false) {
  assertArity("sha256", arguments, 1, 2);
  assertString("sha256", 1, string);
  if (binary !== undefined) assertBoolean("sha256", 2, binary);
  const h = crypto.createHash("sha256").update(string);
  return binary ? new Uint8Array(h.digest()) : h.digest("hex");
}

/**
 * md5(string)
 * @param {string} string
 * @param {boolean} [binary=false]
 * @returns {string|Uint8Array}
 */
export function md5(string, binary = false) {
  assertArity("md5", arguments, 1, 2);
  assertString("md5", 1, string);
  if (binary !== undefined) assertBoolean("md5", 2, binary);
  const h = crypto.createHash("md5").update(string);
  return binary ? new Uint8Array(h.digest()) : h.digest("hex");
}

/**
 * hash(algorithm, data)
 * @param {string} algo
 * @param {string} data
 * @param {boolean} [binary=false]
 * @returns {string|Uint8Array}
 */
export function hash(algo, data, binary = false) {
  assertArity("hash", arguments, 2, 3);
  assertString("hash", 1, algo);
  assertString("hash", 2, data);
  if (binary !== undefined) assertBoolean("hash", 3, binary);
  const h = crypto.createHash(algo).update(data);
  return binary ? new Uint8Array(h.digest()) : h.digest("hex");
}


/**
 * Password hashing algorithms (compat subset).
 * PHP's PASSWORD_DEFAULT is currently bcrypt, but implementing bcrypt without deps is heavy.
 * This library provides a secure default based on scrypt and a PHP-like hash string format.
 */

/**
 * Load bcryptjs synchronously (CJS) in an ESM environment.
 * We keep it lazy to avoid cost for users that never use bcrypt.
 * @returns {any}
 */
function _loadBcrypt() {
  try {
    const mod = require("bcryptjs");
    return mod?.default ?? mod;
  } catch (e) {
    throw new Error(
      "bcryptjs is required for PASSWORD_BCRYPT/$2y$ support. Please install it (npm i bcryptjs)."
    );
  }
}

function _normalizeBcryptPrefix(hash) {
  // PHP emits $2y$; most JS libs expect $2b$ or $2a$.
  if (typeof hash === "string" && hash.startsWith("$2y$")) return "$2b$" + hash.slice(4);
  return hash;
}
export const PASSWORD_DEFAULT = 0;
export const PASSWORD_BCRYPT = 1;
export const PASSWORD_ARGON2I = 2;
export const PASSWORD_ARGON2ID = 3;

/**
 * password_hash — Creates a password hash.
 * @see https://www.php.net/manual/en/function.password-hash.php
 * @param {string} password
 * @param {number} algo
 * @param {Record<string, any>} [options]
 * @returns {string}
 */
export function password_hash(password, algo = PASSWORD_DEFAULT, options = {}) {
  assertArity("password_hash", arguments, 2, 3);
  assertString("password_hash", 1, password);
  assertNumber("password_hash", 2, algo);


  if (algo === PASSWORD_BCRYPT) {
    const bcrypt = _loadBcrypt();
    const cost = Number(options.cost ?? 10);
    if (!Number.isInteger(cost) || cost < 4 || cost > 31) {
      throw new TypeError("password_hash(): options.cost must be an int between 4 and 31");
    }
    const salt = bcrypt.genSaltSync(cost);
    const hash = bcrypt.hashSync(password, salt);
    // PHP uses $2y$ prefix; normalize output to match PHP for storage.
    return hash.startsWith("$2") ? "$2y$" + hash.slice(4) : hash;
  }

  // Secure default: scrypt with tunable params.
  // Output format: $scrypt$N=<N>,r=<r>,p=<p>$<saltB64>$<hashB64>
  // This is NOT byte-for-byte compatible with PHP's bcrypt output, but parity functions work (verify / needs_rehash).
  if (algo === PASSWORD_DEFAULT) {
    const N = Number(options.N ?? 1 << 14);
    const r = Number(options.r ?? 8);
    const p = Number(options.p ?? 1);
    const keylen = Number(options.keylen ?? 64);

    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, keylen, { N, r, p });
    return `$scrypt$N=${N},r=${r},p=${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
  }

  if (algo === PASSWORD_BCRYPT || algo === PASSWORD_ARGON2I || algo === PASSWORD_ARGON2ID) {
    throw new Error("password_hash(): This library currently supports PASSWORD_DEFAULT (scrypt-based) only");
  }
  throw new Error("password_hash(): Unknown algorithm");
}

/**
 * password_verify — Verifies that a password matches a hash.
 * @see https://www.php.net/manual/en/function.password-verify.php
 * @param {string} password
 * @param {string} hash
 * @returns {boolean}
 */
export function password_verify(password, hash) {
assertArity("password_verify", arguments, 2, 2);
assertString("password_verify", 1, password);
assertString("password_verify", 2, hash);

// bcrypt ($2y$, $2a$, $2b$)
if (hash.startsWith("$2y$") || hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
  const bcrypt = _loadBcrypt();
  return bcrypt.compareSync(password, _normalizeBcryptPrefix(hash));
}

// scrypt format: $scrypt$N=...,r=...,p=...$salt$hash
if (hash.startsWith("$2y$") || hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
    // cost is the 2-digit number after the prefix, like $2y$10$...
    const cost = Number(hash.slice(4, 6));
    return { algo: PASSWORD_BCRYPT, algoName: "bcrypt", options: { cost: Number.isFinite(cost) ? cost : undefined } };
  }

  if (hash.startsWith("$scrypt$")) {
  const parts = hash.split("$");
  if (parts.length < 5) return false;
  const params = parts[2];
  const saltB64 = parts[3];
  const hashB64 = parts[4];
  const m2 = /N=(\d+),r=(\d+),p=(\d+)/.exec(params);
  if (!m2) return false;
  const N = Number(m2[1]);
  const r = Number(m2[2]);
  const p = Number(m2[3]);
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const derived = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return crypto.timingSafeEqual(expected, derived);
}

return false;
}

/**
 * password_needs_rehash — Checks if a hash matches the given options.
 * @see https://www.php.net/manual/en/function.password-needs-rehash.php
 * @param {string} hash
 * @param {number} algo
 * @param {Record<string, any>} [options]
 * @returns {boolean}
 */
export function password_needs_rehash(hash, algo = PASSWORD_DEFAULT, options = {}) {
  assertArity("password_needs_rehash", arguments, 2, 3);
  assertString("password_needs_rehash", 1, hash);
  assertNumber("password_needs_rehash", 2, algo);

  if (algo !== PASSWORD_DEFAULT) return true;
  if (!hash.startsWith("$scrypt$")) return true;

  const paramsPart = hash.split("$")[2] ?? "";
  const params = Object.fromEntries(paramsPart.split(",").filter(Boolean).map((kv) => kv.split("=")));
  const N = Number(params.N);
  const r = Number(params.r);
  const p = Number(params.p);

  const wantN = Number(options.N ?? 1 << 14);
  const wantr = Number(options.r ?? 8);
  const wantp = Number(options.p ?? 1);
  return N !== wantN || r !== wantr || p !== wantp;
}

/**
 * password_get_info — Returns information about the given hash.
 * @see https://www.php.net/manual/en/function.password-get-info.php
 * @param {string} hash
 * @returns {{algo:number, algoName:string, options:Record<string, any>}}
 */
export function password_get_info(hash) {
  assertArity("password_get_info", arguments, 1, 1);
  assertString("password_get_info", 1, hash);

  if (hash.startsWith("$2y$") || hash.startsWith("$2a$") || hash.startsWith("$2b$")) {
    // cost is the 2-digit number after the prefix, like $2y$10$...
    const cost = Number(hash.slice(4, 6));
    return { algo: PASSWORD_BCRYPT, algoName: "bcrypt", options: { cost: Number.isFinite(cost) ? cost : undefined } };
  }

  if (hash.startsWith("$scrypt$")) {
    const paramsPart = hash.split("$")[2] ?? "";
    const params = Object.fromEntries(paramsPart.split(",").filter(Boolean).map((kv) => kv.split("=")));
    return { algo: PASSWORD_DEFAULT, algoName: "scrypt", options: { N: Number(params.N), r: Number(params.r), p: Number(params.p) } };
  }
  return { algo: 0, algoName: "unknown", options: {} };
}