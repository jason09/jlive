/// <reference path="./src/chain.generated.d.ts" />

import type * as Variables from "./src/php/variables.js";
import type * as MathMod from "./src/php/math.js";
import type * as StringMod from "./src/php/string.js";
import type * as ArrayMod from "./src/php/array.js";
import type * as FileMod from "./src/php/file.js";
import type * as DateMod from "./src/php/date.js";
import type * as DateTimeMod from "./src/php/datetime.js";
import type * as JsonMod from "./src/php/json.js";
import type * as CryptoMod from "./src/php/crypto.js";
import type * as PregMod from "./src/php/preg.js";
import type * as SerializeMod from "./src/php/serialize.js";
import type * as LocaleMod from "./src/php/locale.js";
import type * as NetworkMod from "./src/php/network.js";
import type * as CookieMod from "./src/php/cookie.js";
import type * as SessionMod from "./src/php/session.js";

export { chain, Chain } from "./src/chain.js";

type FlatModules =
  typeof Variables &
  typeof MathMod &
  typeof StringMod &
  typeof ArrayMod &
  typeof FileMod &
  typeof DateMod &
  typeof DateTimeMod &
  typeof JsonMod &
  typeof CryptoMod &
  typeof PregMod &
  typeof SerializeMod &
  typeof LocaleMod &
  typeof NetworkMod &
  typeof CookieMod &
  typeof SessionMod;

export type PHPNamespace = Readonly<{
  Variables: typeof Variables;
  String: typeof StringMod;
  Array: typeof ArrayMod;
  Math: typeof MathMod;
  Date: typeof DateMod;
  DateTime: typeof DateTimeMod;
  JSON: typeof JsonMod;
  Crypto: typeof CryptoMod;
  Preg: typeof PregMod;
  Serialize: typeof SerializeMod;
  Locale: typeof LocaleMod;
  Network: typeof NetworkMod;
  Cookie: typeof CookieMod;
  Session: typeof SessionMod;
  File: typeof FileMod;
}>;

export const PHP: PHPNamespace;

/**
 * Flat PHP-like namespace (backward compatible with older jLive versions).
 */
export type JliveFlat = FlatModules & {
  foreach: typeof ArrayMod.foreach_;
};

export const JlivePHP: JliveFlat;
export const JliveFile: typeof FileMod;
export const JliveEncrypt: typeof CryptoMod;
