/**
 * PHP-like network functions (subset).
 *
 * NOTE: Many PHP network functions are synchronous; in Node they are naturally async.
 * Functions that resolve DNS are provided as async returning Promise.
 *
 * @module php/network
 */

import dns from "node:dns/promises";
import os from "node:os";
import { assertArity, assertNumber, assertString, typeError } from "../internal/assert.js";

/**
 * gethostname — Gets the host name.
 * @see https://www.php.net/manual/en/function.gethostname.php
 * @returns {string}
 */
export function gethostname() {
  assertArity("gethostname", arguments, 0, 0);
  return os.hostname();
}

/**
 * gethostbyname — Get the IPv4 address corresponding to a given Internet host name.
 * @see https://www.php.net/manual/en/function.gethostbyname.php
 * @param {string} hostname
 * @returns {Promise<string>}
 */
export async function gethostbyname(hostname) {
  assertArity("gethostbyname", arguments, 1, 1);
  assertString("gethostbyname", 1, hostname);
  try {
    const r = await dns.lookup(hostname, { family: 4 });
    return r.address;
  } catch {
    // PHP returns the input string on failure
    return hostname;
  }
}

/**
 * gethostbynamel — Get a list of IPv4 addresses corresponding to a given Internet host name.
 * @see https://www.php.net/manual/en/function.gethostbynamel.php
 * @param {string} hostname
 * @returns {Promise<string[]|false>}
 */
export async function gethostbynamel(hostname) {
  assertArity("gethostbynamel", arguments, 1, 1);
  assertString("gethostbynamel", 1, hostname);
  try {
    const rr = await dns.resolve4(hostname);
    return rr.length ? rr : false;
  } catch {
    return false;
  }
}

/**
 * ip2long — Converts a string containing an (IPv4) Internet Protocol dotted address into a long integer.
 * @see https://www.php.net/manual/en/function.ip2long.php
 * @param {string} ipAddress
 * @returns {number|false}
 */
export function ip2long(ipAddress) {
  assertArity("ip2long", arguments, 1, 1);
  assertString("ip2long", 1, ipAddress);
  const parts = ipAddress.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  // unsigned 32-bit
  const v = ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
  // PHP returns signed int on 32-bit builds; we return unsigned safe number
  return v;
}

/**
 * long2ip — Converts an long integer address into a string in (IPv4) Internet standard dotted format.
 * @see https://www.php.net/manual/en/function.long2ip.php
 * @param {number} properAddress
 * @returns {string|false}
 */
export function long2ip(properAddress) {
  assertArity("long2ip", arguments, 1, 1);
  if (typeof properAddress !== "number") typeError("long2ip", 1, "int", properAddress);
  const v = properAddress >>> 0;
  const a = (v >>> 24) & 255;
  const b = (v >>> 16) & 255;
  const c = (v >>> 8) & 255;
  const d = v & 255;
  return `${a}.${b}.${c}.${d}`;
}



/**
 * parse_url — Parse a URL and return its components.
 * @see https://www.php.net/manual/en/function.parse-url.php
 * @param {string} url
 * @param {number} [component]
 * @returns {Record<string, any>|string|number|null|false}
 */
export function parse_url(url, component) {
  assertArity("parse_url", arguments, 1, 2);
  assertString("parse_url", 1, url);
  if (component !== undefined) assertNumber("parse_url", 2, component);

  try {
    const u = new URL(url, "http://example.local");
    const parts = {
      scheme: u.protocol ? u.protocol.replace(":", "") : null,
      host: u.hostname || null,
      port: u.port ? Number(u.port) : null,
      user: u.username || null,
      pass: u.password || null,
      path: u.pathname || null,
      query: u.search ? u.search.slice(1) : null,
      fragment: u.hash ? u.hash.slice(1) : null,
    };

    if (component === undefined) return parts;

    // PHP components
    const PHP_URL_SCHEME = 0;
    const PHP_URL_HOST = 1;
    const PHP_URL_PORT = 2;
    const PHP_URL_USER = 3;
    const PHP_URL_PASS = 4;
    const PHP_URL_PATH = 5;
    const PHP_URL_QUERY = 6;
    const PHP_URL_FRAGMENT = 7;

    switch (component) {
      case PHP_URL_SCHEME: return parts.scheme;
      case PHP_URL_HOST: return parts.host;
      case PHP_URL_PORT: return parts.port;
      case PHP_URL_USER: return parts.user;
      case PHP_URL_PASS: return parts.pass;
      case PHP_URL_PATH: return parts.path;
      case PHP_URL_QUERY: return parts.query;
      case PHP_URL_FRAGMENT: return parts.fragment;
      default:
        throw new Error("Unsupported component");
    }
  } catch {
    return false;
  }
}

/**
 * http_build_query — Generate URL-encoded query string.
 * @see https://www.php.net/manual/en/function.http-build-query.php
 * @param {any} data
 * @param {string} [numericPrefix]
 * @param {string} [argSeparator]
 * @param {number} [encodingType]
 * @returns {string}
 */
export function http_build_query(data, numericPrefix = "", argSeparator = "&", encodingType = 1) {
  assertArity("http_build_query", arguments, 1, 4);
  if (typeof data !== "object" || data === null) typeError("http_build_query", 1, "array|object", data);
  assertString("http_build_query", 2, numericPrefix);
  assertString("http_build_query", 3, argSeparator);
  assertNumber("http_build_query", 4, encodingType);

  // PHP_QUERY_RFC1738 = 1 (space -> +), PHP_QUERY_RFC3986 = 2 (space -> %20)
  const enc = (s) => {
    const r = encodeURIComponent(s);
    return encodingType === 1 ? r.replace(/%20/g, "+") : r;
  };

  const parts = [];
  const build = (prefix, value) => {
    if (value === null || value === undefined) {
      parts.push(`${enc(prefix)}=`);
      return;
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) build(`${prefix}[${i}]`, value[i]);
      } else {
        for (const k of Object.keys(value)) build(`${prefix}[${k}]`, value[k]);
      }
      return;
    }
    parts.push(`${enc(prefix)}=${enc(String(value))}`);
  };

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) build(`${numericPrefix}${i}`, data[i]);
  } else {
    for (const k of Object.keys(data)) {
      const key = /^[0-9]+$/.test(k) ? `${numericPrefix}${k}` : k;
      build(key, data[k]);
    }
  }
  return parts.join(argSeparator);
}

/**
 * filter_var — Filters a variable with a specified filter.
 * Subset: FILTER_VALIDATE_IP, FILTER_VALIDATE_EMAIL, FILTER_VALIDATE_URL
 * @see https://www.php.net/manual/en/function.filter-var.php
 * @param {any} variable
 * @param {number} filter
 * @param {any} [options]
 * @returns {any|false}
 */
export function filter_var(variable, filter, options = undefined) {
  assertArity("filter_var", arguments, 2, 3);
  assertNumber("filter_var", 2, filter);

  const val = String(variable);

  const FILTER_VALIDATE_IP = 275;
  const FILTER_VALIDATE_EMAIL = 274;
  const FILTER_VALIDATE_URL = 273;

  if (filter === FILTER_VALIDATE_IP) {
    // IPv4 only in this subset
    return ip2long(val) !== false ? val : false;
  }
  if (filter === FILTER_VALIDATE_EMAIL) {
    // pragmatic email regex
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    return ok ? val : false;
  }
  if (filter === FILTER_VALIDATE_URL) {
    try {
      new URL(val);
      return val;
    } catch {
      return false;
    }
  }

  throw new Error("filter_var(): unsupported filter in this build");
}

/**
 * get_headers — Fetch all the headers sent by the server in response to an HTTP request.
 * @see https://www.php.net/manual/en/function.get-headers.php
 * @param {string} url
 * @param {number} [format]
 * @returns {Promise<any[]|Record<string, any>|false>}
 */
export async function get_headers(url, format = 0) {
  assertArity("get_headers", arguments, 1, 2);
  assertString("get_headers", 1, url);
  assertNumber("get_headers", 2, format);

  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (format === 1) {
      const obj = {};
      for (const [k, v] of res.headers.entries()) obj[k] = v;
      return obj;
    }
    const arr = [];
    arr.push(`HTTP/${res.headers.get("x-http-version") ?? "1.1"} ${res.status} ${res.statusText}`);
    for (const [k, v] of res.headers.entries()) arr.push(`${k}: ${v}`);
    return arr;
  } catch {
    return false;
  }
}


/**
 * inet_pton — Converts a human readable IP address to its packed in_addr representation.
 * Supports IPv4 and IPv6.
 * @see https://www.php.net/manual/en/function.inet-pton.php
 * @param {string} address
 * @returns {Uint8Array|false}
 */
export function inet_pton(address) {
  assertArity("inet_pton", arguments, 1, 1);
  assertString("inet_pton", 1, address);

  // IPv4
  const v4 = address.split(".");
  if (v4.length === 4 && v4.every((p) => p !== "")) {
    const nums = v4.map((p) => Number(p));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    return Uint8Array.from(nums);
  }

  // IPv6 (basic parsing)
  try {
    // Use WHATWG URL trick to validate (not perfect) and manual parse for bytes
    const normalized = address.toLowerCase();
    const parts = normalized.split("::");
    if (parts.length > 2) return false;

    const left = parts[0] ? parts[0].split(":").filter(Boolean) : [];
    const right = parts[1] ? parts[1].split(":").filter(Boolean) : [];

    // handle IPv4-embedded tail
    if (right.length && right[right.length - 1].includes(".")) {
      const tail = right.pop();
      const packed = inet_pton(tail);
      if (packed === false || packed.length !== 4) return false;
      right.push(((packed[0] << 8) | packed[1]).toString(16));
      right.push(((packed[2] << 8) | packed[3]).toString(16));
    }

    const missing = 8 - (left.length + right.length);
    if (missing < 0) return false;

    const full = [...left, ...Array(missing).fill("0"), ...right].map((h) => {
      if (!/^[0-9a-f]{1,4}$/.test(h)) throw new Error("bad");
      return parseInt(h, 16);
    });

    const out = new Uint8Array(16);
    full.forEach((v, i) => {
      out[i * 2] = (v >> 8) & 0xff;
      out[i * 2 + 1] = v & 0xff;
    });
    return out;
  } catch {
    return false;
  }
}

/**
 * inet_ntop — Converts a packed internet address to a human readable representation.
 * Supports IPv4 and IPv6.
 * @see https://www.php.net/manual/en/function.inet-ntop.php
 * @param {Uint8Array|ArrayLike<number>} inAddr
 * @returns {string|false}
 */
export function inet_ntop(inAddr) {
  assertArity("inet_ntop", arguments, 1, 1);
  if (!(inAddr && typeof inAddr.length === "number")) typeError("inet_ntop", 1, "string", inAddr);

  const bytes = Uint8Array.from(inAddr);
  if (bytes.length === 4) {
    return `${bytes[0]}.${bytes[1]}.${bytes[2]}.${bytes[3]}`;
  }
  if (bytes.length !== 16) return false;

  const words = [];
  for (let i = 0; i < 16; i += 2) words.push((bytes[i] << 8) | bytes[i + 1]);

  // compress longest run of zeros
  let bestStart = -1, bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (words[i] !== 0) { i++; continue; }
    let j = i;
    while (j < 8 && words[j] === 0) j++;
    const len = j - i;
    if (len > bestLen) { bestLen = len; bestStart = i; }
    i = j;
  }
  if (bestLen < 2) { bestStart = -1; bestLen = 0; }

  const parts = [];
  for (let i = 0; i < 8; i++) {
    if (i === bestStart) {
      parts.push("");
      i += bestLen - 1;
      if (i === 7) parts.push("");
      continue;
    }
    parts.push(words[i].toString(16));
  }
  return parts.join(":").replace(/:{3,}/, "::");
}

