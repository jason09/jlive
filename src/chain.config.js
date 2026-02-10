/**
 * chain.config.js
 * Shared config for:
 *  - runtime chain auto-generation (src/chain.js)
 *  - TS chain surface generator (scripts/generate-chain-types.mjs)
 *
 * This file is intentionally conservative: it only auto-chains functions that
 * make sense as fluent transforms on the current value.
 */

/**
 * Decide where the chained value should be injected.
 * - defaultInject="first": fn(value, ...args)
 * - defaultInject="last" : fn(...args, value)
 *
 * INJECT_LAST is a simple override list for "last injection".
 * (For more complex cases, use CHAIN_INJECTION below.)
 */
export const INJECT_LAST = new Set([
  "str_replace",
  "str_ireplace",
]);

/**
 * Functions that should never be auto-chained due to side effects,
 * debug output, global state, request/response, filesystem, async, etc.
 */
export const GLOBAL_SKIP = new Set([
  "var_dump",
  "print_r",
  "define",
  "defined",
  "get_defined_constants",
  "$_GET",
]);

/**
 * Per-module chain rules: skip lists + default inject position.
 * We skip modules that are async or require req/res by default.
 */
export const CHAIN_RULES = [
  { ns: "V", path: "./php/variables.js", defaultInject: "first", skip: new Set(["empty", "isset", "settype", ...GLOBAL_SKIP]) },
  { ns: "S", path: "./php/string.js",    defaultInject: "first", skip: new Set(["parse_str"]) },
  { ns: "A", path: "./php/array.js",     defaultInject: "first", skip: new Set(["foreach_"]) },
  { ns: "M", path: "./php/math.js",      defaultInject: "first", skip: new Set([]) },
  { ns: "D", path: "./php/date.js",      defaultInject: "first", skip: new Set(["date_default_timezone_set"]) },
  { ns: "J", path: "./php/json.js",      defaultInject: "first", skip: new Set([]) },
  { ns: "C", path: "./php/crypto.js",    defaultInject: "first", skip: new Set(["generate"]) },
  { ns: "P", path: "./php/preg.js",      defaultInject: "first", skip: new Set(["preg_match", "preg_match_all", "preg_split", "preg_grep", "preg_quote"]) },
  { ns: "Z", path: "./php/serialize.js", defaultInject: "first", skip: new Set([]) },
  { ns: "L", path: "./php/locale.js",    defaultInject: "first", skip: new Set(["setlocale"]) },

  // Intentionally excluded from auto-chain:
  // N (network, async), K (cookie req/res), X (session req/res), F (file side effects)
];

/**
 * Fine-grained injection overrides for functions whose "subject" is not
 * at position 0 or last, or where PHP supports ambiguous argument orders.
 *
 * Format (single line per key as requested):
 *  - inject: number   (0-based index where the chained value should be inserted)
 *      0 => first, 1 => second, 2 => third, -1 => last
 *  - normalizeArgs?: (args:any[]) => any[]  (optional; adjusts args before injection)
 */
export const CHAIN_INJECTION = {
  // -------------------------
  // String: delimiter/needle first, subject second
  // PHP: explode(delimiter, string, limit?)
  explode: { inject: 1, normalizeArgs: (args) => (args.length === 0 ? [" "] : args) },

  // PHP: strpbrk(haystack, char_list) -> haystack first (auto-chain default is fine)
  // But if you want chaining the "char_list", uncomment:
  // strpbrk: { inject: 0 },

  // PHP: strspn(string, mask, start?, length?) -> string first (default ok)
  // PHP: strcspn(string, mask, start?, length?) -> string first (default ok)

  // PHP: strpos(haystack, needle, offset?)
  strpos: { inject: 0 },
  stripos: { inject: 0 },
  strrpos: { inject: 0 },
  strripos: { inject: 0 },
  strstr: { inject: 0 },     // strstr(haystack, needle, before_needle?)
  stristr: { inject: 0 },
  strpbrk: { inject: 0 },

  // PHP: substr_count(haystack, needle, offset?, length?)
  substr_count: { inject: 0 },

  // PHP: substr_compare(main_str, str, offset, length?, case_insensitive?)
  substr_compare: { inject: 0 },

  // PHP: str_replace(search, replace, subject)
  str_replace: { inject: 2 },
  str_ireplace: { inject: 2 },

  // PHP: htmlentities(string, flags?, encoding?, double_encode?)
  htmlentities: { inject: 0 },
  // PHP: htmlspecialchars(string, flags?, encoding?, double_encode?)
  htmlspecialchars: { inject: 0 },
  // PHP: htmlspecialchars_decode(string, flags?)
  htmlspecialchars_decode: { inject: 0 },

  // -------------------------
  // preg_* : pattern first, subject second/third
  // PHP: preg_match(pattern, subject, matches?, flags?, offset?)
  preg_match: { inject: 1 },
  // PHP: preg_match_all(pattern, subject, matches?, flags?, offset?)
  preg_match_all: { inject: 1 },
  // PHP: preg_split(pattern, subject, limit?, flags?)
  preg_split: { inject: 1 },
  // PHP: preg_grep(pattern, input, flags?)
  preg_grep: { inject: 1 },
  // PHP: preg_replace(pattern, replacement, subject, limit?, count?)
  preg_replace: { inject: 2 },

  // -------------------------
  // Array: callback first, array second
  // PHP: array_map(callback, array, ...)
  array_map: { inject: 1 },

  // -------------------------
  // Date: format first, timestamp second
  // PHP: date(format, timestamp?)
  date: { inject: 1 },
  // PHP: gmdate(format, timestamp?)
  gmdate: { inject: 1 },

  // -------------------------
  // implode/join: glue first, array second (with optional convenience)
  // PHP: implode(glue, pieces) but also implode(pieces)
  implode: { inject: 1, normalizeArgs: (args) => (args.length === 0 ? [""] : args) },
  join: { inject: 1, normalizeArgs: (args) => (args.length === 0 ? [""] : args) },

  // -------------------------
  // Crypto (optional convenience)
  // PHP: password_verify(password, hash)
  // If chaining the PASSWORD: chain("pass").password_verify(hash)
  password_verify: { inject: 0 }
};

