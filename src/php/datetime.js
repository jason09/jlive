/**
 * Deeper PHP-like Date/Time parity: DateTime, DateTimeZone, DateInterval (subset).
 *
 * Goals:
 * - Provide a familiar API surface for common PHP usage in Node.
 * - Correct timezone-aware formatting using Intl.DateTimeFormat.
 * - Best-effort parsing for common inputs (ISO-8601, RFC3339, Unix timestamps, and simple relative strings).
 *
 * Limitations:
 * - This is not a full replacement for PHP's ext/date; complex relative parsing and historical TZ quirks are limited.
 *
 * @module php/datetime
 */

import crypto from "node:crypto";
import { assertArity, assertString, typeError } from "../internal/assert.js";

function _isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function _nowMs() {
  return Date.now();
}

function _parseUnixAt(str) {
  // "@1234567890" => seconds
  const n = Number(str.slice(1));
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n) * 1000;
}

function _parseRelative(str, baseMs) {
  // Very small subset: "+1 day", "-2 hours", "+3 weeks", "+15 minutes"
  const m = /^\s*([+-])\s*(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s*$/i.exec(str);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const qty = Number(m[2]) * sign;
  const unit = m[3].toLowerCase();

  const d = new Date(baseMs);
  switch (unit) {
    case "second":
    case "seconds":
      return baseMs + qty * 1000;
    case "minute":
    case "minutes":
      return baseMs + qty * 60_000;
    case "hour":
    case "hours":
      return baseMs + qty * 3_600_000;
    case "day":
    case "days":
      d.setDate(d.getDate() + qty);
      return d.getTime();
    case "week":
    case "weeks":
      d.setDate(d.getDate() + qty * 7);
      return d.getTime();
    case "month":
    case "months":
      d.setMonth(d.getMonth() + qty);
      return d.getTime();
    case "year":
    case "years":
      d.setFullYear(d.getFullYear() + qty);
      return d.getTime();
    default:
      return null;
  }
}

function _parseDateTimeString(time, baseMs) {
  if (time === "now") return _nowMs();
  if (time.startsWith("@")) {
    const ms = _parseUnixAt(time);
    if (ms !== null) return ms;
  }
  const rel = _parseRelative(time, baseMs);
  if (rel !== null) return rel;

  // ISO/RFC formats: let JS parse.
  const d = new Date(time);
  if (!Number.isNaN(d.getTime())) return d.getTime();

  return null;
}

function _formatInTimeZone(ms, timeZone, locale = "en-US", opts = {}) {
  const dtf = new Intl.DateTimeFormat(locale, { timeZone, ...opts });
  return dtf.format(new Date(ms));
}

function _partsInTimeZone(ms, timeZone, locale = "en-US", opts = {}) {
  const dtf = new Intl.DateTimeFormat(locale, { timeZone, ...opts });
  return dtf.formatToParts(new Date(ms));
}

function _tzOffsetMinutes(ms, timeZone) {
  // Compute offset by comparing "same instant" formatted in tz vs UTC.
  const utc = new Date(ms);
  const parts = _partsInTimeZone(ms, timeZone, "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const y = get("year");
  const mo = get("month");
  const da = get("day");
  const h = get("hour");
  const mi = get("minute");
  const s = get("second");
  const asUTC = Date.UTC(y, mo - 1, da, h, mi, s);
  return Math.round((asUTC - ms) / 60_000);
}

/**
 * DateTimeZone (subset)
 * @see https://www.php.net/manual/en/class.datetimezone.php
 */
export class DateTimeZone {
  /**
   * @param {string} timezone
   */
  constructor(timezone) {
    assertArity("DateTimeZone.__construct", arguments, 1, 1);
    assertString("DateTimeZone.__construct", 1, timezone);
    if (!_isValidTimeZone(timezone)) throw new RangeError(`DateTimeZone: invalid time zone '${timezone}'`);
    this.timezone = timezone;
  }

  /** @returns {string} */
  getName() {
    return this.timezone;
  }

  /**
   * Best-effort offset in seconds for a given DateTime.
   * @param {DateTime} dt
   * @returns {number}
   */
  getOffset(dt) {
    if (!(dt instanceof DateTime)) typeError("DateTimeZone.getOffset", 1, "DateTime", dt);
    const mins = _tzOffsetMinutes(dt.getTimestamp() * 1000, this.timezone);
    return -mins * 60;
  }
}

/**
 * DateInterval (subset)
 * @see https://www.php.net/manual/en/class.dateinterval.php
 */
export class DateInterval {
  /**
   * @param {string} spec ISO 8601 duration, e.g. "P1D", "PT2H", "P3Y6M4DT12H30M5S"
   */
  constructor(spec) {
    assertArity("DateInterval.__construct", arguments, 1, 1);
    assertString("DateInterval.__construct", 1, spec);
    const m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(spec);
    if (!m) throw new RangeError("DateInterval: invalid interval specification");
    this.y = Number(m[1] ?? 0);
    this.m = Number(m[2] ?? 0);
    this.d = Number(m[3] ?? 0);
    this.h = Number(m[4] ?? 0);
    this.i = Number(m[5] ?? 0);
    this.s = Number(m[6] ?? 0);
    this.invert = 0;
  }

  /** @returns {string} */
  format() {
    // minimal
    return `P${this.y}Y${this.m}M${this.d}DT${this.h}H${this.i}M${this.s}S`;
  }
}

const _DEFAULT_TZ = { value: "UTC" };

/**
 * date_default_timezone_set — Sets the default timezone used by all date/time functions.
 * @see https://www.php.net/manual/en/function.date-default-timezone-set.php
 * @param {string} timezone
 * @returns {boolean}
 */
export function date_default_timezone_set(timezone) {
  assertArity("date_default_timezone_set", arguments, 1, 1);
  assertString("date_default_timezone_set", 1, timezone);
  if (!_isValidTimeZone(timezone)) return false;
  _DEFAULT_TZ.value = timezone;
  return true;
}

/**
 * date_default_timezone_get — Gets the default timezone.
 * @see https://www.php.net/manual/en/function.date-default-timezone-get.php
 * @returns {string}
 */
export function date_default_timezone_get() {
  return _DEFAULT_TZ.value;
}

/**
 * DateTime (subset)
 * @see https://www.php.net/manual/en/class.datetime.php
 */
export class DateTime {
  /**
   * @param {string} [time="now"]
   * @param {DateTimeZone|string|null} [timezone=null]
   */
  constructor(time = "now", timezone = null) {
    assertArity("DateTime.__construct", arguments, 0, 2);
    if (time !== undefined) assertString("DateTime.__construct", 1, String(time));

    let tz = _DEFAULT_TZ.value;
    if (timezone instanceof DateTimeZone) tz = timezone.getName();
    else if (typeof timezone === "string") tz = timezone;
    else if (timezone !== null && timezone !== undefined) typeError("DateTime.__construct", 2, "DateTimeZone|string|null", timezone);

    if (!_isValidTimeZone(tz)) throw new RangeError(`DateTime: invalid time zone '${tz}'`);

    const base = _nowMs();
    const ms = _parseDateTimeString(String(time), base);
    if (ms === null) throw new RangeError("DateTime: failed to parse time string");

    this._ms = ms;
    this._tz = tz;
  }

  /** @returns {number} */
  getTimestamp() {
    return Math.trunc(this._ms / 1000);
  }

  /**
   * @param {number} timestamp
   * @returns {DateTime}
   */
  setTimestamp(timestamp) {
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) typeError("DateTime.setTimestamp", 1, "int", timestamp);
    this._ms = Math.trunc(timestamp) * 1000;
    return this;
  }

  /**
   * @param {DateTimeZone|string} timezone
   * @returns {DateTime}
   */
  setTimezone(timezone) {
    let tz = timezone;
    if (timezone instanceof DateTimeZone) tz = timezone.getName();
    if (typeof tz !== "string") typeError("DateTime.setTimezone", 1, "DateTimeZone|string", timezone);
    if (!_isValidTimeZone(tz)) throw new RangeError(`DateTime.setTimezone(): invalid time zone '${tz}'`);
    this._tz = tz;
    return this;
  }

  /** @returns {DateTimeZone} */
  getTimezone() {
    return new DateTimeZone(this._tz);
  }

  /**
   * modify — Modify the datetime (subset).
   * Supports "+/-N unit" and "now".
   * @see https://www.php.net/manual/en/datetime.modify.php
   * @param {string} modifier
   * @returns {DateTime}
   */
  modify(modifier) {
    assertString("DateTime.modify", 1, modifier);
    const ms = _parseDateTimeString(modifier, this._ms);
    if (ms === null) throw new RangeError("DateTime.modify(): unsupported modifier");
    this._ms = ms;
    return this;
  }

  /**
   * format — Format the datetime using PHP-like tokens (delegates to PHP.date()).
   * This function is wired by src/php/date.js which re-exports `date_format`.
   * @param {string} format
   * @returns {string}
   */
  format(format) {
    assertString("DateTime.format", 1, format);
    // Lazy import to avoid circular dependency cost.
    // eslint-disable-next-line no-async-promise-executor
    const mod = globalThis.__jlive_date_module__;
    if (!mod?.date_format) throw new Error("DateTime.format(): date_format binding missing");
    return mod.date_format(format, this._ms, this._tz);
  }
}

/**
 * date_create — Alias of new DateTime().
 * @see https://www.php.net/manual/en/function.date-create.php
 * @param {string} [time]
 * @param {DateTimeZone|string|null} [timezone]
 * @returns {DateTime}
 */
export function date_create(time = "now", timezone = null) {
  return new DateTime(time, timezone);
}

/**
 * date_interval_create_from_date_string — Parse an interval from a human string (subset).
 * Supports "N day(s)", "N hour(s)", "N minute(s)", "N second(s)".
 * @see https://www.php.net/manual/en/function.date-interval-create-from-date-string.php
 * @param {string} str
 * @returns {DateInterval}
 */
export function date_interval_create_from_date_string(str) {
  assertArity("date_interval_create_from_date_string", arguments, 1, 1);
  assertString("date_interval_create_from_date_string", 1, str);
  const m = /^\s*(\d+)\s*(second|seconds|minute|minutes|hour|hours|day|days)\s*$/i.exec(str);
  if (!m) throw new RangeError("date_interval_create_from_date_string(): unsupported string");
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("second")) return new DateInterval(`PT${n}S`);
  if (unit.startsWith("minute")) return new DateInterval(`PT${n}M`);
  if (unit.startsWith("hour")) return new DateInterval(`PT${n}H`);
  return new DateInterval(`P${n}D`);
}

/**
 * date_add — Add a DateInterval to a DateTime.
 * @see https://www.php.net/manual/en/function.date-add.php
 * @param {DateTime} dt
 * @param {DateInterval} interval
 * @returns {DateTime}
 */
export function date_add(dt, interval) {
  if (!(dt instanceof DateTime)) typeError("date_add", 1, "DateTime", dt);
  if (!(interval instanceof DateInterval)) typeError("date_add", 2, "DateInterval", interval);
  const d = new Date(dt._ms);
  d.setFullYear(d.getFullYear() + interval.y);
  d.setMonth(d.getMonth() + interval.m);
  d.setDate(d.getDate() + interval.d);
  d.setHours(d.getHours() + interval.h);
  d.setMinutes(d.getMinutes() + interval.i);
  d.setSeconds(d.getSeconds() + interval.s);
  dt._ms = d.getTime();
  return dt;
}

/**
 * date_sub — Subtract a DateInterval from a DateTime.
 * @see https://www.php.net/manual/en/function.date-sub.php
 * @param {DateTime} dt
 * @param {DateInterval} interval
 * @returns {DateTime}
 */
export function date_sub(dt, interval) {
  if (!(dt instanceof DateTime)) typeError("date_sub", 1, "DateTime", dt);
  if (!(interval instanceof DateInterval)) typeError("date_sub", 2, "DateInterval", interval);
  const inv = new DateInterval(interval.format());
  inv.y = -inv.y; inv.m = -inv.m; inv.d = -inv.d; inv.h = -inv.h; inv.i = -inv.i; inv.s = -inv.s;
  return date_add(dt, inv);
}

/**
 * date_diff — Difference between two DateTimes (approx).
 * @see https://www.php.net/manual/en/function.date-diff.php
 * @param {DateTime} a
 * @param {DateTime} b
 * @returns {{days:number, invert:number}}
 */
export function date_diff(a, b) {
  if (!(a instanceof DateTime)) typeError("date_diff", 1, "DateTime", a);
  if (!(b instanceof DateTime)) typeError("date_diff", 2, "DateTime", b);
  const diffMs = b._ms - a._ms;
  const invert = diffMs < 0 ? 1 : 0;
  const days = Math.floor(Math.abs(diffMs) / 86_400_000);
  return { days, invert };
}

export function _uuidSessionId() {
  return crypto.randomBytes(16).toString("hex");
}
