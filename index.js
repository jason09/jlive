/**
 * jLive (JlivePHP) - PHP-like functions for modern Node.js (ES2025).
 *
 * - ESM only (package.json: {"type":"module"}).
 * - TypeScript-friendly via bundled index.d.ts.
 * - Functions grouped by modules (PHP.String, PHP.Array, ...).
 * - Flat export (JlivePHP) kept for backward compatibility.
 * - Optional chaining via `chain(value)`.
 */

import * as Variables from "./src/php/variables.js";
import * as MathMod from "./src/php/math.js";
import * as StringMod from "./src/php/string.js";
import * as ArrayMod from "./src/php/array.js";
import * as FileMod from "./src/php/file.js";
import * as DateMod from "./src/php/date.js";
import * as DateTimeMod from "./src/php/datetime.js";
import * as JsonMod from "./src/php/json.js";
import * as CryptoMod from "./src/php/crypto.js";
import * as PregMod from "./src/php/preg.js";
import * as SerializeMod from "./src/php/serialize.js";
import * as LocaleMod from "./src/php/locale.js";
import * as NetworkMod from "./src/php/network.js";
import * as CookieMod from "./src/php/cookie.js";
import * as SessionMod from "./src/php/session.js";

export { chain, Chain } from "./src/chain.js";

/**
 * Namespaced modules (recommended).
 */
export const PHP = Object.freeze({
  Variables,
  Math: MathMod,
  String: StringMod,
  Array: ArrayMod,
  File: FileMod,
  Date: DateMod,
  DateTime: DateTimeMod,
  JSON: JsonMod,
  Crypto: CryptoMod,
  Preg: PregMod,
  Serialize: SerializeMod,
  Locale: LocaleMod,
  Network: NetworkMod,
  Cookie: CookieMod,
  Session: SessionMod,
});

/**
 * Flat export (legacy).
 * Notes:
 * - `foreach` is supported via `foreach_` in the module and also exposed as `foreach`.
 */
export const JlivePHP = {
  ...Variables,
  ...MathMod,
  ...StringMod,
  ...ArrayMod,
  ...FileMod,
  ...DateMod,
  ...DateTimeMod,
  ...JsonMod,
  ...CryptoMod,
  ...PregMod,
  ...SerializeMod,
  ...LocaleMod,
  ...NetworkMod,
  ...CookieMod,
  ...SessionMod,
};

// Provide exact PHP name for foreach (JS keyword safe in module name).
if (typeof JlivePHP.foreach_ === "function" && typeof JlivePHP.foreach !== "function") {
  JlivePHP.foreach = JlivePHP.foreach_;
}

export const JliveFile = FileMod;
export const JliveEncrypt = CryptoMod;
