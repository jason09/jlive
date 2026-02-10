/**
 * PHP serialize/unserialize (subset) with true PHP wire format.
 *
 * Supported types: null, boolean, number (int/double), string (UTF-8 byte length),
 * arrays (JS arrays and plain objects), and stdClass-like objects (as PHP arrays).
 *
 * Unsupported: references (R/r), custom objects, resources.
 *
 * @module php/serialize
 */

import { assertArity, assertString, typeError } from "../internal/assert.js";

/** @param {string} s */
function utf8ByteLength(s) {
  return new TextEncoder().encode(s).length;
}

/**
 * serialize — Generates a storable representation of a value.
 * @see https://www.php.net/manual/en/function.serialize.php
 * @param {any} value
 * @returns {string}
 */
export function serialize(value) {
  assertArity("serialize", arguments, 1, 1);

  const t = typeof value;
  if (value === null || value === undefined) return "N;";
  if (t === "boolean") return `b:${value ? 1 : 0};`;
  if (t === "number") {
    if (Number.isInteger(value)) return `i:${value};`;
    if (Number.isFinite(value)) return `d:${String(value)};`;
    return "N;"; // PHP converts NAN/INF oddly; keep safe
  }
  if (t === "string") {
    const len = utf8ByteLength(value);
    return `s:${len}:"${value}";`;
  }
  if (Array.isArray(value)) {
    // numeric keys 0..n-1
    let out = `a:${value.length}:{`;
    for (let i = 0; i < value.length; i++) {
      out += serialize(i);
      out += serialize(value[i]);
    }
    out += "}";
    return out;
  }
  if (t === "object") {
    const keys = Object.keys(value);
    let out = `a:${keys.length}:{`;
    for (const k of keys) {
      // PHP array keys are int or string; keep string
      const asNum = Number(k);
      if (String(asNum) === k && Number.isInteger(asNum)) out += serialize(asNum);
      else out += serialize(String(k));
      out += serialize(value[k]);
    }
    out += "}";
    return out;
  }
  // functions/symbol/bigint etc.
  return "N;";
}

/**
 * unserialize — Creates a PHP value from a stored representation.
 * @see https://www.php.net/manual/en/function.unserialize.php
 * @param {string} str
 * @returns {any}
 */
export function unserialize(str) {
  assertArity("unserialize", arguments, 1, 1);
  assertString("unserialize", 1, str);

  let i = 0;

  const readUntil = (ch) => {
    const start = i;
    const idx = str.indexOf(ch, i);
    if (idx === -1) throw new TypeError("unserialize(): Unexpected end of string");
    i = idx + 1;
    return str.slice(start, idx);
  };

  const readChars = (n) => {
    const s = str.slice(i, i + n);
    if (s.length !== n) throw new TypeError("unserialize(): Unexpected end of string");
    i += n;
    return s;
  };

  const expect = (s) => {
    if (str.slice(i, i + s.length) !== s) throw new TypeError(`unserialize(): Expected "${s}" at ${i}`);
    i += s.length;
  };

  const parse = () => {
    const type = str[i++];
    switch (type) {
      case "N":
        expect(";");
        return null;
      case "b": {
        expect(":");
        const v = readUntil(";");
        return v === "1";
      }
      case "i": {
        expect(":");
        const v = readUntil(";");
        return parseInt(v, 10);
      }
      case "d": {
        expect(":");
        const v = readUntil(";");
        return parseFloat(v);
      }
      case "s": {
        expect(":");
        const lenStr = readUntil(":");
        const len = parseInt(lenStr, 10);
        expect('"');
        // len is byte length; we read chars approximately.
        // For most ASCII this is exact. For multi-byte, we must decode by bytes.
        // We'll decode from UTF-8 bytes for correctness.
        const bytes = new TextEncoder().encode(str.slice(i));
        // find the slice of bytes that gives len
        const slice = bytes.slice(0, len);
        const value = new TextDecoder().decode(slice);
        // advance i by char length of decoded value
        i += value.length;
        expect('"');
        expect(";");
        return value;
      }
      case "a": {
        expect(":");
        const countStr = readUntil(":");
        const count = parseInt(countStr, 10);
        expect("{");
        const obj = {};
        let maxIndex = -1;
        let isList = true;
        for (let n = 0; n < count; n++) {
          const k = parse();
          const v = parse();
          obj[k] = v;
          if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
            maxIndex = Math.max(maxIndex, k);
          } else {
            isList = false;
          }
        }
        expect("}");
        if (isList) {
          // convert to JS array if keys are 0..maxIndex contiguous
          const arr = [];
          for (let idx = 0; idx <= maxIndex; idx++) {
            if (!(idx in obj)) { isList = false; break; }
            arr[idx] = obj[idx];
          }
          if (isList) return arr;
        }
        return obj;
      }
      default:
        throw new TypeError(`unserialize(): Unsupported type "${type}"`);
    }
  };

  const out = parse();
  return out;
}
