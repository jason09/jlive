/**
 * Cookie helpers with PHP-like signatures.
 *
 * In PHP, cookies are managed by the runtime. In Node, you must provide `req` and/or `res`.
 *
 * @module php/cookie
 */

import { assertArity, assertBoolean, assertNumber, assertString, typeError } from "../internal/assert.js";

/** @param {string} header */
function parseCookieHeader(header) {
  const out = {};
  if (!header) return out;
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(p.slice(0, idx).trim());
    const v = decodeURIComponent(p.slice(idx + 1).trim());
    out[k] = v;
  }
  return out;
}

/**
 * $_COOKIE — Read cookies from an HTTP request.
 * @param {any} req Node http.IncomingMessage-like object
 * @returns {Record<string,string>}
 */
export function $_COOKIE(req) {
  assertArity("$_COOKIE", arguments, 1, 1);
  if (!req || typeof req !== "object") typeError("$_COOKIE", 1, "object", req);
  const header = req.headers?.cookie ?? req.headers?.Cookie ?? "";
  return parseCookieHeader(String(header || ""));
}

/**
 * setcookie — Send a cookie.
 * @see https://www.php.net/manual/en/function.setcookie.php
 * @param {string} name
 * @param {string} [value]
 * @param {number} [expires]
 * @param {string} [path]
 * @param {string} [domain]
 * @param {boolean} [secure]
 * @param {boolean} [httponly]
 * @param {any} [res] Node http.ServerResponse-like object (required to set header)
 * @param {{samesite?:"Lax"|"Strict"|"None"}} [options]
 * @returns {boolean}
 */
export function setcookie(
  name,
  value = "",
  expires = 0,
  path = "",
  domain = "",
  secure = false,
  httponly = false,
  res = undefined,
  options = {}
) {
  assertArity("setcookie", arguments, 1, 9);
  assertString("setcookie", 1, name);
  assertString("setcookie", 2, String(value));
  assertNumber("setcookie", 3, expires);
  assertString("setcookie", 4, path);
  assertString("setcookie", 5, domain);
  assertBoolean("setcookie", 6, secure);
  assertBoolean("setcookie", 7, httponly);
  if (!res || typeof res.setHeader !== "function") {
    throw new TypeError("setcookie(): In Node you must pass a ServerResponse-like `res` as parameter 8");
  }

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`;
  if (expires && Number.isFinite(expires)) {
    const d = new Date(expires * 1000);
    cookie += `; Expires=${d.toUTCString()}`;
    cookie += `; Max-Age=${Math.max(0, Math.floor(expires - Date.now() / 1000))}`;
  }
  if (path) cookie += `; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += `; Secure`;
  if (httponly) cookie += `; HttpOnly`;
  if (options?.samesite) cookie += `; SameSite=${options.samesite}`;

  const prev = res.getHeader?.("Set-Cookie");
  const list = prev ? (Array.isArray(prev) ? prev : [String(prev)]) : [];
  list.push(cookie);
  res.setHeader("Set-Cookie", list);
  return true;
}
