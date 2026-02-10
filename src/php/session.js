/**
 * PHP-like session_* semantics (improved parity) for Node.
 *
 * Design:
 * - Works with Node HTTP IncomingMessage/ServerResponse (req/res).
 * - Default handler: in-memory Map (DEV).
 * - Supports custom save handlers like PHP via session_set_save_handler().
 * - Supports cookie params and session name.
 *
 * Limitations:
 * - File-based handler available when session_save_path() is set (PHP-like sess_* files).
 * - Garbage collection is best-effort (manual via session_gc()).
 *
 * @module php/session
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { assertArity, assertNumber, assertString, typeError } from "../internal/assert.js";
import { $_COOKIE, setcookie } from "./cookie.js";

export const PHP_SESSION_DISABLED = 0;
export const PHP_SESSION_NONE = 1;
export const PHP_SESSION_ACTIVE = 2;

let _status = PHP_SESSION_NONE;
let _sessionName = "PHPSESSID";

/** @type {{lifetime:number, path:string, domain:string, secure:boolean, httponly:boolean, samesite:"Lax"|"Strict"|"None"}} */
let _cookieParams = {
  lifetime: 0,
  path: "/",
  domain: "",
  secure: false,
  httponly: true,
  samesite: "Lax",
};

const _memStore = new Map(); // sid -> {data:string, mtime:number}

let _currentId = "";
let _currentData = {};
let _isDirty = false;
let _req = null;
let _res = null;

/**
 * Default save handler (memory).
 * Signature mirrors PHP handler style.
 */
let _handler = {
  open: async () => true,
  close: async () => true,
  read: async (sid) => _memStore.get(sid)?.data ?? "",
  write: async (sid, data) => {
    _memStore.set(sid, { data, mtime: Date.now() });
    return true;
  },
  destroy: async (sid) => {
    _memStore.delete(sid);
    return true;
  },
  gc: async (maxlifetime) => {
    const cutoff = Date.now() - maxlifetime * 1000;
    for (const [sid, v] of _memStore.entries()) {
      if (v.mtime < cutoff) _memStore.delete(sid);
    }
    return true;
  },
};

const _defaultMemHandler = _handler;

function _makeFileHandler(savePath) {
  const dir = savePath;
  const fileFor = (sid) => path.join(dir, `sess_${sid}`);
  return {
    open: async () => {
      await fs.mkdir(dir, { recursive: true });
      return true;
    },
    close: async () => true,
    read: async (sid) => {
      try {
        return await fs.readFile(fileFor(sid), "utf8");
      } catch {
        return "";
      }
    },
    write: async (sid, data) => {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fileFor(sid), data, "utf8");
      return true;
    },
    destroy: async (sid) => {
      try {
        await fs.unlink(fileFor(sid));
      } catch {
        // ignore
      }
      return true;
    },
    gc: async (maxlifetime) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const cutoff = Date.now() - maxlifetime * 1000;
        await Promise.all(entries.map(async (ent) => {
          if (!ent.isFile()) return;
          if (!ent.name.startsWith("sess_")) return;
          const fp = path.join(dir, ent.name);
          try {
            const st = await fs.stat(fp);
            if (st.mtimeMs < cutoff) await fs.unlink(fp);
          } catch {
            // ignore
          }
        }));
      } catch {
        // ignore
      }
      return true;
    },
  };
}


function _newId() {
  return crypto.randomBytes(16).toString("hex");
}

function _ensureActive(fn) {
  if (_status !== PHP_SESSION_ACTIVE) throw new Error(`${fn}(): session is not active`);
}

function _serialize(data) {
  // Use JSON for now; PHP serialize/unserialize is available as separate module.
  return JSON.stringify(data ?? {});
}

function _deserialize(data) {
  if (!data) return {};
  try {
    const v = JSON.parse(data);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/**
 * session_name — Get or set the session name.
 * @see https://www.php.net/manual/en/function.session-name.php
 * @param {string} [name]
 * @returns {string}
 */
export function session_name(name = undefined) {
  assertArity("session_name", arguments, 0, 1);
  if (name !== undefined) {
    assertString("session_name", 1, name);
    if (_status === PHP_SESSION_ACTIVE) throw new Error("session_name(): cannot change name when session is active");
    _sessionName = name;
  }
  return _sessionName;
}

/**
 * session_get_cookie_params — Get current cookie params.
 * @see https://www.php.net/manual/en/function.session-get-cookie-params.php
 * @returns {{lifetime:number, path:string, domain:string, secure:boolean, httponly:boolean, samesite:string}}
 */
export function session_get_cookie_params() {
  return { ..._cookieParams };
}

/**
 * session_set_cookie_params — Set session cookie parameters.
 * @see https://www.php.net/manual/en/function.session-set-cookie-params.php
 * @param {number|{lifetime?:number,path?:string,domain?:string,secure?:boolean,httponly?:boolean,samesite?:string}} opts
 * @param {string} [path]
 * @param {string} [domain]
 * @param {boolean} [secure]
 * @param {boolean} [httponly]
 * @returns {boolean}
 */
export function session_set_cookie_params(opts, path = undefined, domain = undefined, secure = undefined, httponly = undefined) {
  assertArity("session_set_cookie_params", arguments, 1, 5);
  if (_status === PHP_SESSION_ACTIVE) throw new Error("session_set_cookie_params(): cannot change params when session is active");

  if (typeof opts === "number") {
    _cookieParams.lifetime = opts;
    if (path !== undefined) _cookieParams.path = String(path);
    if (domain !== undefined) _cookieParams.domain = String(domain);
    if (secure !== undefined) _cookieParams.secure = Boolean(secure);
    if (httponly !== undefined) _cookieParams.httponly = Boolean(httponly);
    return true;
  }

  if (opts && typeof opts === "object") {
    if (opts.lifetime !== undefined) _cookieParams.lifetime = Number(opts.lifetime);
    if (opts.path !== undefined) _cookieParams.path = String(opts.path);
    if (opts.domain !== undefined) _cookieParams.domain = String(opts.domain);
    if (opts.secure !== undefined) _cookieParams.secure = Boolean(opts.secure);
    if (opts.httponly !== undefined) _cookieParams.httponly = Boolean(opts.httponly);
    if (opts.samesite !== undefined) _cookieParams.samesite = /** @type any */ (String(opts.samesite));
    return true;
  }

  typeError("session_set_cookie_params", 1, "int|object", opts);
}

/**
 * session_status — Returns the current session status.
 * @see https://www.php.net/manual/en/function.session-status.php
 * @returns {number}
 */
export function session_status() {
  return _status;
}

/**
 * session_id — Get or set the session id.
 * @see https://www.php.net/manual/en/function.session-id.php
 * @param {string} [id]
 * @returns {string}
 */
export function session_id(id = undefined) {
  assertArity("session_id", arguments, 0, 1);
  if (id !== undefined) {
    assertString("session_id", 1, id);
    if (_status === PHP_SESSION_ACTIVE) throw new Error("session_id(): cannot set id when session is active");
    _currentId = id;
  }
  return _currentId;
}

/**
 * session_set_save_handler — Set user-level session storage functions.
 * @see https://www.php.net/manual/en/function.session-set-save-handler.php
 * @param {{open?:Function,close?:Function,read?:Function,write?:Function,destroy?:Function,gc?:Function}} handler
 * @returns {boolean}
 */
export function session_set_save_handler(handler) {
  assertArity("session_set_save_handler", arguments, 1, 1);
  if (!handler || typeof handler !== "object") typeError("session_set_save_handler", 1, "object", handler);
  if (_status === PHP_SESSION_ACTIVE) throw new Error("session_set_save_handler(): cannot change handler when session is active");

  _handler = {
    open: handler.open ?? _handler.open,
    close: handler.close ?? _handler.close,
    read: handler.read ?? _handler.read,
    write: handler.write ?? _handler.write,
    destroy: handler.destroy ?? _handler.destroy,
    gc: handler.gc ?? _handler.gc,
  };
  return true;
}

/**
 * session_start — Start new or resume existing session.
 * @see https://www.php.net/manual/en/function.session-start.php
 * @param {any} req Node IncomingMessage
 * @param {any} res Node ServerResponse
 * @param {{use_strict_mode?:boolean}} [options]
 * @returns {Promise<boolean>}
 */
export async function session_start(req, res, options = {}) {
  assertArity("session_start", arguments, 2, 3);
  
// If a session save path is configured and the current handler is still the default memory handler,
// switch to a PHP-like file save handler that stores sess_<id> files.
if (__sessionSavePath && _handler === _defaultMemHandler) {
  _handler = _makeFileHandler(__sessionSavePath);
}

_req = req;
  _res = res;

  if (_status === PHP_SESSION_ACTIVE) return true;

  const cookies = $_COOKIE(req);
  let sid = cookies[_sessionName] ?? _currentId;

  if (sid && typeof sid !== "string") sid = String(sid);

  // strict mode: only accept existing IDs that the handler can read
  const strict = Boolean(options.use_strict_mode ?? false);

  await _handler.open?.();

  if (sid) {
    const raw = await _handler.read?.(sid);
    if (strict && !raw) sid = "";
    _currentData = _deserialize(raw);
  }

  if (!sid) {
    sid = _newId();
    _currentData = {};
    // send cookie now
    setcookie(_sessionName, sid, res, {
      ..._cookieParams,
      // PHP uses lifetime seconds; setcookie expects either Date or seconds; our setcookie handles both.
      expires: _cookieParams.lifetime > 0 ? Math.floor(Date.now() / 1000) + _cookieParams.lifetime : 0,
    });
  }

  _currentId = sid;
  _isDirty = false;
  _status = PHP_SESSION_ACTIVE;

  // Expose a PHP-like superglobal
  req.__SESSION = _currentData;

  return true;
}

/**
 * session_write_close — Write session data and end session.
 * @see https://www.php.net/manual/en/function.session-write-close.php
 * @returns {Promise<boolean>}
 */
export async function session_write_close() {
  _ensureActive("session_write_close");
  if (_isDirty) await _handler.write?.(_currentId, _serialize(_currentData));
  await _handler.close?.();
  _status = PHP_SESSION_NONE;
  _req = null;
  _res = null;
  _isDirty = false;
  return true;
}

/**
 * session_destroy — Destroy the session.
 * @see https://www.php.net/manual/en/function.session-destroy.php
 * @returns {Promise<boolean>}
 */
export async function session_destroy() {
  _ensureActive("session_destroy");
  await _handler.destroy?.(_currentId);
  _currentData = {};
  _isDirty = false;
  _status = PHP_SESSION_NONE;
  return true;
}

/**
 * session_regenerate_id — Update the current session id.
 * @see https://www.php.net/manual/en/function.session-regenerate-id.php
 * @param {boolean} [deleteOldSession=false]
 * @returns {Promise<boolean>}
 */
export async function session_regenerate_id(deleteOldSession = false) {
  assertArity("session_regenerate_id", arguments, 0, 1);
  _ensureActive("session_regenerate_id");

  const old = _currentId;
  const sid = _newId();
  _currentId = sid;
  _isDirty = true;

  if (_res) {
    setcookie(_sessionName, sid, _res, {
      ..._cookieParams,
      expires: _cookieParams.lifetime > 0 ? Math.floor(Date.now() / 1000) + _cookieParams.lifetime : 0,
    });
  }

  if (deleteOldSession) await _handler.destroy?.(old);
  return true;
}

/**
 * session_gc — Run garbage collection.
 * @param {number} maxlifetime seconds
 * @returns {Promise<boolean>}
 */
export async function session_gc(maxlifetime = 1440) {
  assertArity("session_gc", arguments, 0, 1);
  if (typeof maxlifetime !== "number") typeError("session_gc", 1, "int", maxlifetime);
  await _handler.gc?.(maxlifetime);
  return true;
}

/**
 * session_get — Convenience getter for current session array.
 * @param {string} key
 * @param {any} [defaultValue=null]
 * @returns {any}
 */
export function session_get(key, defaultValue = null) {
  assertArity("session_get", arguments, 1, 2);
  assertString("session_get", 1, key);
  _ensureActive("session_get");
  return Object.prototype.hasOwnProperty.call(_currentData, key) ? _currentData[key] : defaultValue;
}

/**
 * session_set — Convenience setter for current session array.
 * @param {string} key
 * @param {any} value
 * @returns {void}
 */
export function session_set(key, value) {
  assertArity("session_set", arguments, 2, 2);
  assertString("session_set", 1, key);
  _ensureActive("session_set");
  _currentData[key] = value;
  _isDirty = true;
}


// -------------------------
// Additional session parity helpers
// -------------------------

let __sessionSavePath = "";
let __sessionCacheLimiter = "nocache";
let __sessionCacheExpire = 180;

/**
 * session_save_path — Get and/or set the current session save path.
 * @see https://www.php.net/manual/en/function.session-save-path.php
 * @param {string} [path]
 * @returns {string}
 */
export function session_save_path(path) {
  assertArity("session_save_path", arguments, 0, 1);
  if (path !== undefined) {
    if (typeof path !== "string") typeError("session_save_path", 1, "string", path);
    __sessionSavePath = path;
  }
  return __sessionSavePath;
}

/**
 * session_cache_limiter — Get and/or set the current cache limiter.
 * @see https://www.php.net/manual/en/function.session-cache-limiter.php
 * @param {string} [cacheLimiter]
 * @returns {string}
 */
export function session_cache_limiter(cacheLimiter) {
  assertArity("session_cache_limiter", arguments, 0, 1);
  if (cacheLimiter !== undefined) {
    if (typeof cacheLimiter !== "string") typeError("session_cache_limiter", 1, "string", cacheLimiter);
    __sessionCacheLimiter = cacheLimiter;
  }
  return __sessionCacheLimiter;
}

/**
 * session_cache_expire — Get and/or set the current cache expire.
 * @see https://www.php.net/manual/en/function.session-cache-expire.php
 * @param {number} [value]
 * @returns {number}
 */
export function session_cache_expire(value) {
  assertArity("session_cache_expire", arguments, 0, 1);
  if (value !== undefined) {
    if (typeof value !== "number") typeError("session_cache_expire", 1, "int", value);
    __sessionCacheExpire = value | 0;
  }
  return __sessionCacheExpire;
}
