// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: node scripts/generate-chain-types.mjs

import type { Chain as BaseChain } from "./chain.js";
import type * as V from "./php/variables.js";
import type * as S from "./php/string.js";
import type * as A from "./php/array.js";
import type * as M from "./php/math.js";
import type * as D from "./php/date.js";
import type * as J from "./php/json.js";
import type * as C from "./php/crypto.js";
import type * as P from "./php/preg.js";
import type * as Z from "./php/serialize.js";
import type * as L from "./php/locale.js";

type InjectLastNames = "str_replace" | "str_ireplace";
type Inject0Names = "strpos" | "stripos" | "strrpos" | "strripos" | "strstr" | "stristr" | "strpbrk" | "substr_count" | "substr_compare" | "htmlentities" | "htmlspecialchars" | "htmlspecialchars_decode" | "password_verify";
type Inject1Names = "explode" | "preg_match" | "preg_match_all" | "preg_split" | "preg_grep" | "array_map" | "date" | "gmdate" | "implode" | "join";
type Inject2Names = "str_replace" | "str_ireplace" | "preg_replace";
type InjectNeg1Names = never;
type DropFirst<T extends any[]> = T extends [any, ...infer R] ? R : never;
type DropLast<T extends any[]> = T extends [...infer R, any] ? R : never;
type DropAt1<T extends any[]> = T extends [any, any, ...infer R] ? [T[0], ...R] : never;
type DropAt2<T extends any[]> = T extends [any, any, any, ...infer R] ? [T[0], T[1], ...R] : never;
type ParamsFirst<F> = F extends (...a: infer A) => any ? DropFirst<A> : never;
type ParamsLast<F>  = F extends (...a: infer A) => any ? DropLast<A> : never;
type ParamsAt1<F>   = F extends (...a: infer A) => any ? DropAt1<A> : never;
type ParamsAt2<F>   = F extends (...a: infer A) => any ? DropAt2<A> : never;
type Ret<F> = F extends (...a: any[]) => infer R ? R : never;

type Chainify<M, DefaultInject extends "first" | "last"> = {
  [K in keyof M as K extends string ? K : never]:
    // Positional injection overrides from CHAIN_INJECTION
    K extends InjectNeg1Names ? (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>> :
    K extends Inject2Names    ? (...args: ParamsAt2<M[K]>)  => BaseChain<Ret<M[K]>> :
    K extends Inject1Names    ? (...args: ParamsAt1<M[K]>)  => BaseChain<Ret<M[K]>> :
    K extends Inject0Names    ? (...args: ParamsFirst<M[K]>)=> BaseChain<Ret<M[K]>> :
    // Simple last-injection list override
    K extends InjectLastNames ? (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>> :
    // Default module injection
    (DefaultInject extends "first" ? (...args: ParamsFirst<M[K]>) => BaseChain<Ret<M[K]>> : (...args: ParamsLast<M[K]>) => BaseChain<Ret<M[K]>>);
};

declare module "./chain.js" {
  interface Chain<T>
    extends
      Chainify<Pick<typeof V, "boolval" | "floatval" | "gettype" | "intval" | "isFunction" | "is_array" | "is_bool" | "is_float" | "is_int" | "is_null" | "is_numeric" | "is_object" | "is_scalar" | "is_string" | "strval">, "first">,
      Chainify<Pick<typeof S, "addcslashes" | "addslashes" | "base64_decode" | "base64_encode" | "chr" | "chunk_split" | "count_chars" | "explode" | "hex2bin" | "html_entity_decode" | "htmlentities" | "htmlspecialchars" | "htmlspecialchars_decode" | "implode" | "lcfirst" | "levenshtein" | "ltrim" | "nl2br" | "number_format" | "ord" | "pack" | "printf" | "quotemeta" | "rawurldecode" | "rawurlencode" | "rtrim" | "similar_text" | "soundex" | "sprintf" | "str_contains" | "str_ends_with" | "str_getcsv" | "str_ireplace" | "str_pad" | "str_repeat" | "str_replace" | "str_rot13" | "str_shuffle" | "str_split" | "str_starts_with" | "str_word_count" | "strcasecmp" | "strcmp" | "strcspn" | "strip_tags" | "stripcslashes" | "stripos" | "stripslashes" | "stristr" | "strlen" | "strnatcasecmp" | "strnatcmp" | "strncasecmp" | "strncmp" | "strpbrk" | "strpos" | "strrchr" | "strrev" | "strripos" | "strrpos" | "strspn" | "strstr" | "strtok" | "strtolower" | "strtoupper" | "strtr" | "substr" | "substr_compare" | "substr_count" | "substr_replace" | "trim" | "trimAll" | "ucfirst" | "ucwords" | "unpack" | "urldecode" | "urlencode" | "vprintf" | "vsprintf" | "wordwrap">, "first">,
      Chainify<Pick<typeof A, "array_change_key_case" | "array_chunk" | "array_column" | "array_combine" | "array_count_values" | "array_diff" | "array_diff_assoc" | "array_diff_key" | "array_diff_uassoc" | "array_diff_ukey" | "array_fill" | "array_fill_keys" | "array_filter" | "array_flip" | "array_intersect" | "array_intersect_assoc" | "array_intersect_key" | "array_intersect_uassoc" | "array_intersect_ufunc" | "array_intersect_ukey" | "array_is_list" | "array_key_exists" | "array_key_first" | "array_key_last" | "array_keys" | "array_map" | "array_merge" | "array_merge_recursive" | "array_multisort" | "array_pad" | "array_pop" | "array_product" | "array_push" | "array_rand" | "array_reduce" | "array_replace" | "array_replace_recursive" | "array_reverse" | "array_search" | "array_shift" | "array_slice" | "array_splice" | "array_sum" | "array_udiff" | "array_udiff_assoc" | "array_udiff_uassoc" | "array_uintersect" | "array_uintersect_assoc" | "array_uintersect_uassoc" | "array_unique" | "array_unshift" | "array_values" | "array_walk" | "array_walk_recursive" | "arsort" | "asort" | "asort_assoc" | "compact" | "count" | "current" | "end" | "in_array" | "key" | "krsort" | "ksort" | "natcasesort" | "natsort" | "next" | "prev" | "range" | "reset" | "rsort" | "shuffle" | "sort" | "uasort" | "uksort" | "usort">, "first">,
      Chainify<Pick<typeof M, "abs" | "acos" | "acosh" | "asin" | "asinh" | "atan" | "atan2" | "atanh" | "base_convert" | "bin2hex" | "bindec" | "ceil" | "cos" | "cosh" | "decbin" | "dechex" | "deg2rad" | "exp" | "expm1" | "floor" | "fmod" | "hexdec" | "hypot" | "intdiv" | "is_finite" | "is_infinite" | "is_nan" | "lcg_value" | "log" | "log10" | "log1p" | "max" | "min" | "mt_getrandmax" | "mt_rand" | "mt_srand" | "pi" | "pow" | "rad2deg" | "rand" | "round" | "sin" | "sinh" | "sqrt" | "tan" | "tanh">, "first">,
      Chainify<Pick<typeof D, "checkdate" | "date" | "date_default_timezone_get" | "date_format" | "date_parse" | "date_parse_from_format" | "getdate" | "gmdate" | "microtime" | "mktime" | "strtotime" | "time" | "timezone_identifiers_list">, "first">,
      Chainify<Pick<typeof J, "json_decode" | "json_encode">, "first">,
      Chainify<Pick<typeof C, "hash" | "md5" | "password_get_info" | "password_hash" | "password_needs_rehash" | "password_verify" | "sha1" | "sha256">, "first">,
      Chainify<Pick<typeof P, "preg_last_error" | "preg_last_error_msg" | "preg_replace">, "first">,
      Chainify<Pick<typeof Z, "serialize" | "unserialize">, "first">,
      Chainify<Pick<typeof L, "strcasecmp_locale" | "strcoll">, "first">
  {
    /** Alias for array foreach (maps to A.foreach_) */
    foreach(callback: (v: any, k: any) => any): BaseChain<any>;
  }
}
