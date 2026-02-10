/**
 * PHP-like date & time functions.
 * @module php/date
 */

import { assertArity, assertNumber, assertString, typeError } from "../internal/assert.js";

let _defaultTimezone = "UTC";

/**
 * date_default_timezone_set — Sets the default timezone used by all date/time functions.
 * @see https://www.php.net/manual/en/function.date-default-timezone-set.php
 * @param {string} timezoneId
 * @returns {boolean}
 */
export function date_default_timezone_set(timezoneId) {
  assertArity("date_default_timezone_set", arguments, 1, 1);
  assertString("date_default_timezone_set", 1, timezoneId);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezoneId }).format(new Date());
    _defaultTimezone = timezoneId;
    return true;
  } catch {
    return false;
  }
}

/**
 * date_default_timezone_get — Gets the default timezone used by all date/time functions.
 * @see https://www.php.net/manual/en/function.date-default-timezone-get.php
 * @returns {string}
 */
export function date_default_timezone_get() {
  assertArity("date_default_timezone_get", arguments, 0, 0);
  return _defaultTimezone;
}

export function checkdate(month, day, year) {
  assertArity("checkdate", arguments, 3, 3);
  [month, day, year].forEach((v, i) => {
    if (typeof v !== "number") typeError("checkdate", i + 1, "int", v);
  });
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * time() returns unix timestamp seconds.
 * @returns {number}
 */
export function time() {
  return Math.floor(Date.now() / 1000);
}

/**
 * microtime(get_as_float=false)
 * @param {boolean} [get_as_float=false]
 * @returns {string|number}
 */
export function microtime(get_as_float = false) {
  assertArity("microtime", arguments, 0, 1);
  if (get_as_float !== undefined && typeof get_as_float !== "boolean") typeError("microtime", 1, "bool", get_as_float);
  const ms = Date.now();
  const sec = Math.floor(ms / 1000);
  const usec = (ms - sec * 1000) / 1000;
  if (get_as_float) return sec + usec;
  return `${usec.toFixed(6)} ${sec}`;
}

/**
 * mktime(hour, minute, second, month, day, year)
 * @returns {number}
 */
export function mktime(hour, minute, second, month, day, year) {
  assertArity("mktime", arguments, 0, 6);
  const now = new Date();
  const h = hour ?? now.getHours();
  const m = minute ?? now.getMinutes();
  const s = second ?? now.getSeconds();
  const mo = (month ?? now.getMonth() + 1) - 1;
  const d = day ?? now.getDate();
  const y = year ?? now.getFullYear();
  [h, m, s, mo, d, y].forEach((v, i) => {
    if (typeof v !== "number") typeError("mktime", i + 1, "int", v);
  });
  return Math.floor(new Date(y, mo, d, h, m, s).getTime() / 1000);
}

/**
 * getdate(timestamp?)
 * @param {number} [timestamp]
 * @returns {Record<string, any>}
 */
export function getdate(timestamp = time()) {
  assertArity("getdate", arguments, 0, 1);
  if (timestamp !== undefined && typeof timestamp !== "number") typeError("getdate", 1, "int", timestamp);
  const d = new Date(timestamp * 1000);
  const wdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    seconds: d.getSeconds(),
    minutes: d.getMinutes(),
    hours: d.getHours(),
    mday: d.getDate(),
    wday: d.getDay(),
    mon: d.getMonth() + 1,
    year: d.getFullYear(),
    yday: Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 86400000),
    weekday: wdays[d.getDay()],
    month: months[d.getMonth()],
    0: timestamp,
  };
}

/**
 * date(format, timestamp?) - supports common PHP tokens.
 * @param {string} format
 * @param {number} [timestamp]
 * @returns {string}
 */

/**
 * Internal helper used by DateTime.format(): format a millisecond epoch in a timezone.
 *
 * This is a "major tokens" implementation (commonly used tokens in real-world PHP code).
 * Tokens supported here include:
 * Y y m n d j H G h g i s u D l N w z W F M t L a A O P Z c r U
 * Escape handling: backslash "\" escapes the next character.
 *
 * @param {string} format
 * @param {number} tsMs
 * @param {string} tz
 * @returns {string}
 */
export function date_format(format, tsMs, tz) {
  assertString("date_format", 1, format);
  assertNumber("date_format", 2, tsMs);
  assertString("date_format", 3, tz);

  const dateObj = new Date(tsMs);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = dtf.formatToParts(dateObj);
  const part = (type) => parts.find((p) => p.type === type)?.value;

  const Y = part("year");
  const m2 = part("month");
  const d2 = part("day");
  const weekdayLong = part("weekday");
  const H2 = part("hour");
  const i2 = part("minute");
  const s2 = part("second");

  const pad2 = (n) => String(n).padStart(2, "0");

  const monthLong = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long" }).format(dateObj);
  const monthShort = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" }).format(dateObj);
  const weekdayShort = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(dateObj);

  // timezone offset minutes in tz (best-effort)
  const tzOffsetMinutes = (() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(dateObj);

      const get = (t) => Number(fmt.find((p) => p.type === t)?.value ?? "0");
      const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
      return Math.round((asUTC - tsMs) / 60_000);
    } catch {
      return 0;
    }
  })();

  const O = (() => {
    const ecart = tzOffsetMinutes;
    const a = Math.abs(ecart);
    const sign = ecart > 0 ? "-" : "+";
    return sign + String(Math.floor(a / 60) * 100 + (a % 60)).padStart(4, "0");
  })();

  const P = O.slice(0, 3) + ":" + O.slice(3);
  const Z = -tzOffsetMinutes * 60;

  // Day-of-year z
  const z = (() => {
    // compute in tz by formatting Y-m-d and building UTC date with those parts
    const y = Number(Y);
    const mo = Number(m2);
    const da = Number(d2);
    const a = Date.UTC(y, mo - 1, da);
    const b = Date.UTC(y, 0, 1);
    return Math.round((a - b) / 864e5);
  })();

  const L = (() => {
    const y = Number(Y);
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 1 : 0;
  })();

  const N = (() => {
    // ISO-8601 day of week 1..7
    const map = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
    return map[weekdayLong] ?? 1;
  })();

  const w = (() => (N % 7)); // 0 (Sun) .. 6 (Sat)

  const W = (() => {
    // ISO week number (approx, tz-based using Y-m-d)
    const y = Number(Y);
    const mo = Number(m2);
    const da = Number(d2);
    const d = new Date(Date.UTC(y, mo - 1, da));
    // Thursday in current week decides the year.
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return pad2(weekNo);
  })();

  const t = (() => {
    const y = Number(Y);
    const mo = Number(m2);
    return new Date(Date.UTC(y, mo, 0)).getUTCDate();
  })();

  const G = String(Number(H2));
  const g = String((Number(H2) % 12) || 12);
  const h = pad2((Number(H2) % 12) || 12);
  const a = Number(H2) > 11 ? "pm" : "am";
  const A = a.toUpperCase();

  const u = String(dateObj.getMilliseconds() * 1000).padStart(6, "0");

  const c = `${Y}-${m2}-${d2}T${pad2(Number(H2))}:${i2}:${s2}${P}`;
  const r = `${weekdayShort}, ${d2} ${monthShort} ${Y} ${pad2(Number(H2))}:${i2}:${s2} ${O}`;
  const U = String(Math.floor(tsMs / 1000));

  const tokens = new Map([
    ["Y", () => Y],
    ["y", () => String(Y).slice(-2)],
    ["m", () => m2],
    ["n", () => String(Number(m2))],
    ["d", () => d2],
    ["j", () => String(Number(d2))],
    ["H", () => H2],
    ["G", () => G],
    ["h", () => h],
    ["g", () => g],
    ["i", () => i2],
    ["s", () => s2],
    ["u", () => u],
    ["D", () => weekdayShort],
    ["l", () => weekdayLong],
    ["N", () => String(N)],
    ["w", () => String(w)],
    ["z", () => String(z)],
    ["W", () => String(W)],
    ["F", () => monthLong],
    ["M", () => monthShort],
    ["t", () => String(t)],
    ["L", () => String(L)],
    ["a", () => a],
    ["A", () => A],
    ["O", () => O],
    ["P", () => P],
    ["Z", () => String(Z)],
    ["c", () => c],
    ["r", () => r],
    ["U", () => U],
  ]);

  let out = "";
  let escape = false;
  for (const ch of format) {
    if (escape) {
      out += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    const fn = tokens.get(ch);
    out += fn ? fn() : ch;
  }
  return out;
}

export function date(format, timestamp = time()) {
  assertArity("date", arguments, 1, 2);
  assertString("date", 1, format);
  if (timestamp !== undefined && typeof timestamp !== "number") typeError("date", 2, "int", timestamp);

  const tsMs = Math.floor(timestamp * 1000);
  const tz = _defaultTimezone;

  // Use Intl to get wall-clock parts in the selected timezone.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
    timeZoneName: "short",
  });

  const parts = dtf.formatToParts(new Date(tsMs));
  const part = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const Y = Number(part("year"));
  const m = Number(part("month"));
  const d = Number(part("day"));
  const H = Number(part("hour"));
  const i = Number(part("minute"));
  const s = Number(part("second"));
  const weekdayShort = part("weekday"); // Mon
  const tzNameShort = part("timeZoneName") || "UTC";

  const pad = (n, w = 2) => String(n).padStart(w, "0");

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const monthNamesShort = monthNames.map((x) => x.slice(0, 3));
  const weekdayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekdayNamesShort = weekdayNames.map((x) => x.slice(0, 3));

  // Determine weekday index in this timezone by parsing weekdayShort.
  const w = Math.max(0, weekdayNamesShort.indexOf(weekdayShort));

  const isLeap = (yy) => (yy % 4 === 0 && yy % 100 !== 0) || (yy % 400 === 0);

  const daysInMonth = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).getUTCDate(); // mm 1..12

  const dayOfYear = () => {
    // Compute using UTC then adjust as "calendar day" in timezone is already in d/m/Y
    const a = Date.UTC(Y, m - 1, d);
    const b = Date.UTC(Y, 0, 1);
    return Math.floor((a - b) / 86400000);
  };

  const isoWeekday = () => (w === 0 ? 7 : w);

  const isoWeekNumber = () => {
    // ISO week: week with Thursday, start Monday.
    const dateUTC = new Date(Date.UTC(Y, m - 1, d));
    const dayNum = isoWeekday();
    dateUTC.setUTCDate(dateUTC.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(dateUTC.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((dateUTC - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  const isoYear = () => {
    const week = isoWeekNumber();
    if (m === 1 && week >= 52) return Y - 1;
    if (m === 12 && week === 1) return Y + 1;
    return Y;
  };

  const tzOffsetMinutes = () => {
    // Calculate offset by comparing UTC timestamp to formatted "wall clock" timestamp.
    // We approximate by reconstructing a UTC date from parts and diffing.
    const approxUtc = Date.UTC(Y, m - 1, d, H, i, s, 0);
    return Math.round((approxUtc - tsMs) / 60000);
  };

  const O = () => {
    const off = tzOffsetMinutes(); // minutes behind UTC (like JS getTimezoneOffset in selected zone)
    const sign = off > 0 ? "-" : "+";
    const a = Math.abs(off);
    const hhmm = pad(Math.floor(a / 60), 2) + pad(a % 60, 2);
    return `${sign}${hhmm}`;
  };

  const P = () => {
    const oo = O();
    return `${oo.slice(0, 3)}:${oo.slice(3)}`;
  };

  const Z = () => -tzOffsetMinutes() * 60;

  const ordinal = (day) => {
    const j = day % 10;
    const k = day % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const swatch = () => {
    // Swatch Internet Time, based on UTC+1
    const utc = new Date(tsMs);
    const secs = utc.getUTCHours() * 3600 + utc.getUTCMinutes() * 60 + utc.getUTCSeconds();
    const beats = Math.floor(((secs + 3600) / 86.4) % 1000);
    return pad(beats, 3);
  };

  const micros = () => pad(new Date(tsMs).getUTCMilliseconds() * 1000, 6);

  const token = (ch) => {
    switch (ch) {
      // Day
      case "d": return pad(d, 2);
      case "D": return weekdayNamesShort[w];
      case "j": return String(d);
      case "l": return weekdayNames[w];
      case "N": return String(isoWeekday());
      case "S": return ordinal(d);
      case "w": return String(w);
      case "z": return String(dayOfYear());
      // Week
      case "W": return pad(isoWeekNumber(), 2);
      // Month
      case "F": return monthNames[m - 1];
      case "m": return pad(m, 2);
      case "M": return monthNamesShort[m - 1];
      case "n": return String(m);
      case "t": return String(daysInMonth(Y, m));
      // Year
      case "L": return isLeap(Y) ? "1" : "0";
      case "o": return String(isoYear());
      case "Y": return String(Y);
      case "y": return String(Y).slice(-2);
      // Time
      case "a": return H > 11 ? "pm" : "am";
      case "A": return H > 11 ? "PM" : "AM";
      case "B": return swatch();
      case "g": return String((H % 12) || 12);
      case "G": return String(H);
      case "h": return pad((H % 12) || 12, 2);
      case "H": return pad(H, 2);
      case "i": return pad(i, 2);
      case "s": return pad(s, 2);
      case "u": return micros(); // microseconds
      case "v": return pad(new Date(tsMs).getUTCMilliseconds(), 3); // milliseconds
      // Timezone
      case "e": return tz;
      case "I": {
        // DST (approx): compare offset Jan vs Jul
        const jan = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, hour: "2-digit" }).formatToParts(new Date(Date.UTC(Y,0,1)));
        const jul = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, hour: "2-digit" }).formatToParts(new Date(Date.UTC(Y,6,1)));
        // If hours differ, DST observed (approx)
        return (jan.find(p=>p.type==="hour")?.value !== jul.find(p=>p.type==="hour")?.value) ? "1" : "0";
      }
      case "O": return O();
      case "P": return P();
      case "T": return tzNameShort;
      case "Z": return String(Z());
      // Full Date/Time
      case "c": return `${token("Y")}-${token("m")}-${token("d")}T${token("H")}:${token("i")}:${token("s")}${token("P")}`;
      case "r": return `${token("D")}, ${token("d")} ${token("M")} ${token("Y")} ${token("H")}:${token("i")}:${token("s")} ${token("O")}`;
      case "U": return String(Math.floor(tsMs / 1000));
      default: return ch;
    }
  };

  let out = "";
  let esc = false;
  for (const ch of format) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    out += token(ch);
  }
  return out;
}


export function strtotime(text, now) {
  assertArity("strtotime", arguments, 1, 2);
  assertString("strtotime", 1, text);
  if (now !== undefined && typeof now !== "number") typeError("strtotime", 2, "int", now);
  const base = now !== undefined ? new Date(now * 1000) : new Date();
  const t = text.trim().toLowerCase();
  if (t === "now") return Math.floor(base.getTime() / 1000);
  if (t === "tomorrow") return Math.floor((base.getTime() + 86400000) / 1000);
  if (t === "yesterday") return Math.floor((base.getTime() - 86400000) / 1000);
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  return false;
}

/**
 * gmdate(format, timestamp?)
 * @param {string} format
 * @param {number} [timestamp]
 * @returns {string}
 */
export function gmdate(format, timestamp = time()) {
  assertArity("gmdate", arguments, 1, 2);
  assertString("gmdate", 1, format);
  if (timestamp !== undefined && typeof timestamp !== "number") typeError("gmdate", 2, "int", timestamp);
  const d = new Date(timestamp * 1000);
  const pad2 = (n) => String(n).padStart(2, "0");
  const pad3 = (n) => String(n).padStart(3, "0");
  const wdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return format.replace(/\\.|[dDjmnyYHisvu]/g, (m) => {
    if (m.startsWith("\\")) return m.slice(1);
    switch (m) {
      case "d":
        return pad2(d.getUTCDate());
      case "D":
        return wdays[d.getUTCDay()];
      case "j":
        return String(d.getUTCDate());
      case "m":
        return pad2(d.getUTCMonth() + 1);
      case "n":
        return String(d.getUTCMonth() + 1);
      case "y":
        return String(d.getUTCFullYear()).slice(-2);
      case "Y":
        return String(d.getUTCFullYear());
      case "H":
        return pad2(d.getUTCHours());
      case "i":
        return pad2(d.getUTCMinutes());
      case "s":
        return pad2(d.getUTCSeconds());
      case "v":
        return pad3(d.getUTCMilliseconds());
      case "u":
        return String(d.getUTCMilliseconds() * 1000).padStart(6, "0");
      default:
        return m;
    }
  });
}

// Bind for DateTime.format() (avoids circular imports).
globalThis.__jlive_date_module__ = { date_format };


/**
 * timezone_identifiers_list — Returns a numerically indexed array containing all defined timezone identifiers.
 * @see https://www.php.net/manual/en/function.timezone-identifiers-list.php
 * @returns {string[]}
 */
export function timezone_identifiers_list() {
  assertArity("timezone_identifiers_list", arguments, 0, 0);
  const fn = Intl?.supportedValuesOf;
  if (typeof fn === "function") {
    try { return fn("timeZone"); } catch { return []; }
  }
  return [];
}

/**
 * date_parse — Returns array with information about a given date.
 * Best-effort using JS Date parsing.
 * @see https://www.php.net/manual/en/function.date-parse.php
 * @param {string} date
 * @returns {Record<string, any>}
 */
export function date_parse(date) {
  assertArity("date_parse", arguments, 1, 1);
  assertString("date_parse", 1, date);

  const d = new Date(date);
  const errors = {};
  const warnings = {};
  const ok = !Number.isNaN(d.getTime());

  return {
    year: ok ? d.getFullYear() : false,
    month: ok ? d.getMonth() + 1 : false,
    day: ok ? d.getDate() : false,
    hour: ok ? d.getHours() : false,
    minute: ok ? d.getMinutes() : false,
    second: ok ? d.getSeconds() : false,
    fraction: ok ? d.getMilliseconds() / 1000 : false,
    warning_count: 0,
    warnings,
    error_count: ok ? 0 : 1,
    errors: ok ? errors : { 0: "Failed to parse time string" },
    is_localtime: true,
    zone_type: 0,
    zone: null,
  };
}

/**
 * date_parse_from_format — Get info about given date formatted according to the specified format.
 * Supports common tokens: Y y m n d j H G i s
 * @see https://www.php.net/manual/en/function.date-parse-from-format.php
 * @param {string} format
 * @param {string} date
 * @returns {Record<string, any>}
 */
export function date_parse_from_format(format, date) {
  assertArity("date_parse_from_format", arguments, 2, 2);
  assertString("date_parse_from_format", 1, format);
  assertString("date_parse_from_format", 2, date);

  const map = {
    Y: "(?<Y>\\d{4})",
    y: "(?<y>\\d{2})",
    m: "(?<m>\\d{2})",
    n: "(?<n>\\d{1,2})",
    d: "(?<d>\\d{2})",
    j: "(?<j>\\d{1,2})",
    H: "(?<H>\\d{2})",
    G: "(?<G>\\d{1,2})",
    i: "(?<i>\\d{2})",
    s: "(?<s>\\d{2})",
  };

  let rx = "^";
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch === "\\\\") {
      i++;
      rx += format[i] ? format[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
      continue;
    }
    if (map[ch]) rx += map[ch];
    else rx += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  rx += "$";

  const re = new RegExp(rx);
  const m = re.exec(date);
  if (!m) {
    return {
      year: false, month: false, day: false, hour: false, minute: false, second: false, fraction: false,
      warning_count: 0, warnings: {}, error_count: 1, errors: { 0: "Format mismatch" }, is_localtime: true,
      zone_type: 0, zone: null,
    };
  }

  const g = m.groups ?? {};
  const year = g.Y ? Number(g.Y) : (g.y ? 2000 + Number(g.y) : false);
  const month = g.m ? Number(g.m) : (g.n ? Number(g.n) : false);
  const day = g.d ? Number(g.d) : (g.j ? Number(g.j) : false);
  const hour = g.H ? Number(g.H) : (g.G ? Number(g.G) : 0);
  const minute = g.i ? Number(g.i) : 0;
  const second = g.s ? Number(g.s) : 0;

  return {
    year, month, day, hour, minute, second, fraction: 0,
    warning_count: 0, warnings: {}, error_count: 0, errors: {}, is_localtime: true,
    zone_type: 0, zone: null,
  };
}
