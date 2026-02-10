# jLive (JlivePHP)

Modern **PHP-like helper library** for Node.js **v24+** (ES2025), shipped as **ESM** with **TypeScript typings**.

This project brings a growing subset of PHP functions to JavaScript with:

- **PHP-like signatures** (parameters + defaults) whenever practical
- **Strict runtime validation** (throws on argument mismatch)
- **Namespaced modules**: `PHP.String.*`, `PHP.Array.*`, etc.
- **Legacy flat export**: `JlivePHP.*`
- Optional **chainable API**: `chain(value).trim().strtoupper().value()`

---

## Requirements

- Node.js **v24+**
- Package is **ESM-only** (`"type": "module"`)

---

## Install

```bash
npm i jlive
```

---

## Dependencies

Runtime dependencies used by this library:

- `bcryptjs` ^2.4.3 — used for PHP-compatible bcrypt (`password_hash/verify`)

Built-in Node modules used (no install needed): `node:crypto`, `node:fs`, `node:path`, `node:os`, `node:dns`, etc.

---

## Quick start

### Namespaced (recommended)

```js
import { PHP } from "jlive";

console.log(PHP.String.ucwords("hello world"));     // Hello World
console.log(PHP.Array.array_sum([1, 2, 3]));        // 6
console.log(PHP.Math.intdiv(10, 3));                // 3
```

### Legacy flat export

```js
import { JlivePHP } from "jlive";

console.log(JlivePHP.trim("  hi  "));
console.log(JlivePHP.array_merge([1,2], [3,4]));
```

### Chaining

```js
import { chain } from "jlive";

const out = chain("  hello world  ")
  .trim()
  .str_replace("world", "jLive")
  .strtoupper()
  .value();

console.log(out); // HELLO JLIVE
```

---

## Notes on compatibility

### JS arrays vs associative arrays (objects)

Most Array functions accept **either**:
- JavaScript arrays (`[]`) for numeric-indexed PHP arrays
- Plain objects (`{}`) for associative PHP arrays

When a function must “return an array”, it returns:
- a JS array when the result is list-like
- a plain object when the result is associative

### `foreach`

PHP has `foreach`, but JavaScript has `for...of` and also treats `foreach` as a reserved-ish identifier in some contexts.
This library exposes:

- `PHP.Array.foreach_()` (safe name)
- `JlivePHP.foreach()` (alias added for PHP naming)

### Async functions

Some Network functions are async because Node APIs are async (DNS / fetch):
- `gethostbyname()`, `gethostbynamel()`, `get_headers()` return **Promise**.

---

## API Reference (by module)

> Tip: all public functions include JSDoc and (when applicable) a `@see` link to the matching PHP manual page.

### Variables

- `boolval`
- `empty`
- `floatval`
- `gettype`
- `intval`
- `isFunction`
- `is_array`
- `is_bool`
- `is_float`
- `is_int`
- `is_null`
- `is_numeric`
- `is_object`
- `is_scalar`
- `is_string`
- `isset`
- `print_r`
- `settype`
- `strval`
- `var_dump`

### Math

- `abs`
- `acos`
- `acosh`
- `asin`
- `asinh`
- `atan`
- `atan2`
- `atanh`
- `base_convert`
- `bin2hex`
- `bindec`
- `ceil`
- `cos`
- `cosh`
- `decbin`
- `dechex`
- `deg2rad`
- `exp`
- `expm1`
- `floor`
- `fmod`
- `hexdec`
- `hypot`
- `intdiv`
- `is_finite`
- `is_infinite`
- `is_nan`
- `lcg_value`
- `log`
- `log10`
- `log1p`
- `max`
- `min`
- `mt_getrandmax`
- `mt_rand`
- `mt_srand`
- `pi`
- `pow`
- `rad2deg`
- `rand`
- `round`
- `sin`
- `sinh`
- `sqrt`
- `tan`
- `tanh`

### String

- `addcslashes`
- `addslashes`
- `base64_decode`
- `base64_encode`
- `chr`
- `chunk_split`
- `count_chars`
- `explode`
- `hex2bin`
- `html_entity_decode`
- `htmlentities`
- `htmlspecialchars`
- `htmlspecialchars_decode`
- `implode`
- `lcfirst`
- `levenshtein`
- `ltrim`
- `nl2br`
- `number_format`
- `ord`
- `pack`
- `parse_str`
- `printf`
- `quotemeta`
- `rawurldecode`
- `rawurlencode`
- `rtrim`
- `similar_text`
- `soundex`
- `sprintf`
- `str_contains`
- `str_ends_with`
- `str_getcsv`
- `str_ireplace`
- `str_pad`
- `str_repeat`
- `str_replace`
- `str_rot13`
- `str_shuffle`
- `str_split`
- `str_starts_with`
- `str_word_count`
- `strcasecmp`
- `strcmp`
- `strcspn`
- `strip_tags`
- `stripcslashes`
- `stripos`
- `stripslashes`
- `stristr`
- `strlen`
- `strnatcasecmp`
- `strnatcmp`
- `strncasecmp`
- `strncmp`
- `strpbrk`
- `strpos`
- `strrchr`
- `strrev`
- `strripos`
- `strrpos`
- `strspn`
- `strstr`
- `strtok`
- `strtolower`
- `strtoupper`
- `strtr`
- `substr`
- `substr_compare`
- `substr_count`
- `substr_replace`
- `trim`
- `trimAll`
- `ucfirst`
- `ucwords`
- `unpack`
- `urldecode`
- `urlencode`
- `vprintf`
- `vsprintf`
- `wordwrap`

### Array

- `array_change_key_case`
- `array_chunk`
- `array_column`
- `array_combine`
- `array_count_values`
- `array_diff`
- `array_diff_assoc`
- `array_diff_key`
- `array_diff_uassoc`
- `array_diff_ukey`
- `array_fill`
- `array_fill_keys`
- `array_filter`
- `array_flip`
- `array_intersect`
- `array_intersect_assoc`
- `array_intersect_key`
- `array_intersect_uassoc`
- `array_intersect_ufunc`
- `array_intersect_ukey`
- `array_is_list`
- `array_key_exists`
- `array_key_first`
- `array_key_last`
- `array_keys`
- `array_map`
- `array_merge`
- `array_merge_recursive`
- `array_multisort`
- `array_pad`
- `array_pop`
- `array_product`
- `array_push`
- `array_rand`
- `array_reduce`
- `array_replace`
- `array_replace_recursive`
- `array_reverse`
- `array_search`
- `array_shift`
- `array_slice`
- `array_splice`
- `array_sum`
- `array_udiff`
- `array_udiff_assoc`
- `array_udiff_uassoc`
- `array_uintersect`
- `array_uintersect_assoc`
- `array_uintersect_uassoc`
- `array_unique`
- `array_unshift`
- `array_values`
- `array_walk`
- `array_walk_recursive`
- `arsort`
- `asort`
- `asort_assoc`
- `compact`
- `count`
- `current`
- `end`
- `foreach_`
- `in_array`
- `key`
- `krsort`
- `ksort`
- `natcasesort`
- `natsort`
- `next`
- `prev`
- `range`
- `reset`
- `rsort`
- `shuffle`
- `sort`
- `uasort`
- `uksort`
- `usort`

### File

- `basename`
- `copy`
- `dirname`
- `fclose`
- `file_exists`
- `file_get_contents`
- `file_put_contents`
- `filesize`
- `fopen`
- `fread`
- `fstat`
- `fwrite`
- `glob`
- `is_dir`
- `is_file`
- `is_link`
- `mkdir`
- `pathinfo`
- `realpath`
- `rename`
- `rmdir`
- `scandir`
- `unlink`

### Date & Time

- `checkdate`
- `date`
- `date_default_timezone_get`
- `date_default_timezone_set`
- `date_format`
- `date_parse`
- `date_parse_from_format`
- `getdate`
- `gmdate`
- `microtime`
- `mktime`
- `strtotime`
- `time`
- `timezone_identifiers_list`

### DateTime (OOP)

- `_uuidSessionId`
- `date_add`
- `date_create`
- `date_default_timezone_get`
- `date_default_timezone_set`
- `date_diff`
- `date_interval_create_from_date_string`
- `date_sub`

### JSON

- `json_decode`
- `json_encode`

### Crypto / Password

- `generate`
- `hash`
- `md5`
- `password_get_info`
- `password_hash`
- `password_needs_rehash`
- `password_verify`
- `sha1`
- `sha256`

**Constants:**
- `PASSWORD_ARGON2I`
- `PASSWORD_ARGON2ID`
- `PASSWORD_BCRYPT`
- `PASSWORD_DEFAULT`

### PCRE / preg_*

- `preg_grep`
- `preg_last_error`
- `preg_last_error_msg`
- `preg_match`
- `preg_match_all`
- `preg_quote`
- `preg_replace`
- `preg_split`

**Constants:**
- `PREG_BACKTRACK_LIMIT_ERROR`
- `PREG_BAD_UTF8_ERROR`
- `PREG_BAD_UTF8_OFFSET_ERROR`
- `PREG_INTERNAL_ERROR`
- `PREG_JIT_STACKLIMIT_ERROR`
- `PREG_NO_ERROR`
- `PREG_OFFSET_CAPTURE`
- `PREG_PATTERN_ORDER`
- `PREG_RECURSION_LIMIT_ERROR`
- `PREG_SET_ORDER`
- `PREG_UNMATCHED_AS_NULL`

### Serialize

- `serialize`
- `unserialize`

### Locale

- `_get_current_locale`
- `setlocale`
- `strcasecmp_locale`
- `strcoll`

**Constants:**
- `LC_ALL`

### Network

- `filter_var`
- `gethostname`
- `http_build_query`
- `inet_ntop`
- `inet_pton`
- `ip2long`
- `long2ip`
- `parse_url`

### Cookie

- `setcookie`

### Session

- `session_cache_expire`
- `session_cache_limiter`
- `session_get`
- `session_get_cookie_params`
- `session_id`
- `session_name`
- `session_save_path`
- `session_set`
- `session_set_cookie_params`
- `session_set_save_handler`
- `session_status`

**Constants:**
- `PHP_SESSION_ACTIVE`
- `PHP_SESSION_DISABLED`
- `PHP_SESSION_NONE`



---

## TypeScript

This package includes `index.d.ts`. Example:

```ts
import { PHP, chain } from "jlive";

const s: string = PHP.String.strtoupper("abc");
const n: number = PHP.Math.intdiv(7, 2);

const chained = chain("  hi ").trim().strtoupper().value();
```

---

## Contributing / extending

The source is organized by domain under `src/php/`:

- `variables.js`
- `math.js`
- `string.js`
- `array.js`
- `file.js`
- `date.js`
- `datetime.js`
- `json.js`
- `crypto.js`
- `preg.js`
- `serialize.js`
- `locale.js`
- `network.js`
- `cookie.js`
- `session.js`

When adding new functions:
1. Keep **PHP parameter order + defaults**.
2. Add **runtime validation** (throw on mismatch).
3. Add **English JSDoc** with a PHP manual `@see` link.

---

## License

MIT
