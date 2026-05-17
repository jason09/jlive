import { PHP, chain, JlivePHP } from "../index.js";
import { spawnSync } from "node:child_process";

function ok(label, cond) {
  if (!cond) throw new Error(`❌ ${label}`);
  console.log(`${label}`);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => String(a).localeCompare(String(b), "en", { numeric: true }))
      .reduce((out, key) => {
        out[key] = canonicalize(value[key]);
        return out;
      }, {});
  }
  return value;
}

function eq(label, a, b) {
  const same =
    (Number.isNaN(a) && Number.isNaN(b)) ||
    (typeof a === "object" && typeof b === "object"
      ? JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b))
      : a === b);

  if (!same) {
    console.error("Expected:", b);
    console.error("Got     :", a);
    throw new Error(`❌ ${label}`);
  }
  console.log(`${label} -> ${a}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let phpCliAvailable;

function hasPhpCli() {
  if (phpCliAvailable !== undefined) return phpCliAvailable;

  const result = spawnSync("php", ["-v"], { encoding: "utf8" });
  phpCliAvailable = !result.error && result.status === 0;
  return phpCliAvailable;
}

function phpJson(code) {
  const result = spawnSync("php", ["-r", code], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`PHP CLI failed:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

console.log("=== jLive PHP Parity Smoke Tests ===");

// ---- String
eq("trim()", PHP.String.trim("  hi  "), "hi");
eq("strtoupper()", PHP.String.strtoupper("ab"), "AB");
eq("base64_encode/decode()", PHP.String.base64_decode(PHP.String.base64_encode("hello")), "hello");
eq("str_contains()", PHP.String.str_contains("hello", "ell"), true);
eq("strip_tags() removes tags",PHP.String.strip_tags("<p>Hello <b>World</b></p>"),"Hello World");
eq("strip_tags() allows tags",PHP.String.strip_tags("<p>Hello <b>World</b></p>", "<p>"),"<p>Hello World</p>");

// ---- Math
eq("fmod()", PHP.Math.fmod(5.5, 2), 1.5);
eq("pi()", Math.round(PHP.Math.pi() * 1000) / 1000, 3.142);

// ---- Array
eq("array_sum()", PHP.Array.array_sum([1, 2, 3]), 6);
eq("array_is_list()", PHP.Array.array_is_list([1, 2, 3]), true);
eq("array_keys() assoc", PHP.Array.array_keys({ a: 1, b: 2 }), ["a", "b"]);
eq("array_values() assoc", PHP.Array.array_values({ a: 1, b: 2 }), [1, 2]);
eq("array_merge() assoc", PHP.Array.array_merge({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
eq("array_key_exists() true", PHP.Array.array_key_exists("a", { a: 1 }), true);
eq("array_key_exists() false", PHP.Array.array_key_exists("z", { a: 1 }), false);
eq("foreach() over object", (() => {
  const a = { a: 1, b: 2 };
  const out = [];
  JlivePHP.foreach(a, (v, k) => out.push(`${k}:${v}`));
  return out.join(",");
})(), "a:1,b:2");

// ---- preg
eq("preg_match()", PHP.Preg.preg_match("/hello/i", "Hello world") === 1, true);

// ---- network
eq("parse_url() relative path", PHP.Network.parse_url("/foo?x=1"), {
  scheme: null,
  host: null,
  port: null,
  user: null,
  pass: null,
  path: "/foo",
  query: "x=1",
  fragment: null,
});
eq("parse_url() relative segment", PHP.Network.parse_url("foo/bar"), {
  scheme: null,
  host: null,
  port: null,
  user: null,
  pass: null,
  path: "foo/bar",
  query: null,
  fragment: null,
});
eq("parse_url() keeps explicit https default port", PHP.Network.parse_url("https://user:pass@example.com:443/a?b=1#c"), {
  scheme: "https",
  host: "example.com",
  port: 443,
  user: "user",
  pass: "pass",
  path: "/a",
  query: "b=1",
  fragment: "c",
});
eq("parse_url() keeps explicit http default port component", PHP.Network.parse_url("http://example.com:80/x", 2), 80);
eq("http_build_query() omits null", PHP.Network.http_build_query({ a: "b c", list: ["x", "y"], nested: { z: 1 }, nil: null }), "a=b+c&list%5B0%5D=x&list%5B1%5D=y&nested%5Bz%5D=1");
eq("http_build_query() RFC3986", PHP.Network.http_build_query({ list: ["x", "y"] }, "", "&", 2), "list%5B0%5D=x&list%5B1%5D=y");

// ---- date / timezone
eq("checkdate() valid", PHP.Date.checkdate(2, 29, 2024), true);
eq("checkdate() invalid", PHP.Date.checkdate(2, 29, 2023), false);
eq("gmdate() epoch", PHP.Date.gmdate("Y-m-d H:i:s", 0), "1970-01-01 00:00:00");
eq("strtotime() UTC literal", PHP.Date.strtotime("1970-01-02 00:00:00 UTC"), 86400);
eq("date_parse() date only", PHP.Date.date_parse("2024-02-29"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 0,
  warnings: [],
  error_count: 0,
  errors: [],
  is_localtime: false,
});
eq("date_parse() timezone offset", PHP.Date.date_parse("2024-02-29T12:34:56+02:00"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: 12,
  minute: 34,
  second: 56,
  fraction: 0,
  warning_count: 0,
  warnings: [],
  error_count: 0,
  errors: [],
  is_localtime: true,
  is_dst: false,
  zone_type: 1,
  zone: 7200,
});
eq("date_parse() double timezone warning", PHP.Date.date_parse("2024-02-29T12:34:56+02:00 UTC"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: 12,
  minute: 34,
  second: 56,
  fraction: 0,
  warning_count: 1,
  warnings: {
    26: "Double timezone specification",
  },
  error_count: 0,
  errors: [],
  is_localtime: true,
  is_dst: false,
  zone_type: 1,
  zone: 7200,
});
eq("date_parse() alpha timezone garbage", PHP.Date.date_parse("abc"), {
  year: false,
  month: false,
  day: false,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 0,
  warnings: [],
  error_count: 1,
  errors: ["The timezone could not be found in the database"],
  is_localtime: true,
  zone_type: 0,
});
eq("date_parse() punctuation garbage", PHP.Date.date_parse("----"), {
  year: false,
  month: false,
  day: false,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 0,
  warnings: [],
  error_count: 4,
  errors: [
    "Unexpected character",
    "Unexpected character",
    "Unexpected character",
    "Unexpected character",
  ],
  is_localtime: false,
});
eq("date_parse() trailing timezone garbage", PHP.Date.date_parse("2024/02/29foo"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 0,
  warnings: [],
  error_count: 1,
  errors: {
    10: "The timezone could not be found in the database",
  },
  is_localtime: true,
  zone_type: 0,
});
eq("date_parse() invalid date warning", PHP.Date.date_parse("2024-02-30"), {
  year: 2024,
  month: 2,
  day: 30,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 1,
  warnings: {
    11: "The parsed date was invalid",
  },
  error_count: 0,
  errors: [],
  is_localtime: false,
});
eq("date_parse() zero month warning", PHP.Date.date_parse("2024-00-01"), {
  year: 2024,
  month: 0,
  day: 1,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 1,
  warnings: {
    11: "The parsed date was invalid",
  },
  error_count: 0,
  errors: [],
  is_localtime: false,
});
eq("date_parse_from_format() ok", PHP.Date.date_parse_from_format("Y-m-d H:i:s", "2024-02-29 12:34:56"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: 12,
  minute: 34,
  second: 56,
  fraction: 0,
  warning_count: 0,
  warnings: [],
  error_count: 0,
  errors: [],
  is_localtime: false,
});
eq("date_parse_from_format() separator mismatch", PHP.Date.date_parse_from_format("Y-m-d", "2024/02/29"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 0,
  warnings: [],
  error_count: 4,
  errors: {
    4: "Unexpected data found.",
    7: "Unexpected data found.",
  },
  is_localtime: false,
});
eq("date_parse_from_format() invalid time warning", PHP.Date.date_parse_from_format("Y-m-d H:i:s", "2024-02-29 25:61:99"), {
  year: 2024,
  month: 2,
  day: 29,
  hour: 25,
  minute: 61,
  second: 99,
  fraction: 0,
  warning_count: 1,
  warnings: {
    19: "The parsed time was invalid",
  },
  error_count: 0,
  errors: [],
  is_localtime: false,
});
eq("date_parse_from_format() invalid date warning", PHP.Date.date_parse_from_format("Y-m-d", "2024-02-30"), {
  year: 2024,
  month: 2,
  day: 30,
  hour: false,
  minute: false,
  second: false,
  fraction: false,
  warning_count: 1,
  warnings: {
    10: "The parsed date was invalid",
  },
  error_count: 0,
  errors: [],
  is_localtime: false,
});

const originalTimezone = PHP.Date.date_default_timezone_get();
eq("date_default_timezone_set()", PHP.Date.date_default_timezone_set("America/New_York"), true);
eq("date() timezone aware", PHP.Date.date("Y-m-d H:i:s", 0), "1969-12-31 19:00:00");
eq("getdate() timezone aware", PHP.Date.getdate(0), {
  0: 0,
  seconds: 0,
  minutes: 0,
  hours: 19,
  mday: 31,
  wday: 3,
  mon: 12,
  year: 1969,
  yday: 364,
  weekday: "Wednesday",
  month: "December",
});
eq("mktime() timezone aware", PHP.Date.mktime(0, 0, 0, 1, 1, 1970), 18000);
eq("mktime() DST gap normalizes forward", PHP.Date.mktime(2, 30, 0, 3, 10, 2024), 1710055800);
eq("date_default_timezone_restore()", PHP.Date.date_default_timezone_set(originalTimezone), true);

if (hasPhpCli()) {
  console.log("PHP CLI available; running differential parity checks.");

  const phpParity = phpJson(`
    date_default_timezone_set("UTC");

    function normalize_parse_url($parts) {
      $normalized = [
        "scheme" => null,
        "host" => null,
        "port" => null,
        "user" => null,
        "pass" => null,
        "path" => null,
        "query" => null,
        "fragment" => null,
      ];
      if ($parts === false) return false;
      foreach ($parts as $key => $value) {
        $normalized[$key] = $value;
      }
      return $normalized;
    }

    echo json_encode([
      "arrayKeysAssoc" => array_keys(["a" => 1, "b" => 2]),
      "arrayValuesAssoc" => array_values(["a" => 1, "b" => 2]),
      "arrayMergeAssoc" => array_merge(["a" => 1], ["b" => 2]),
      "arrayKeyExistsTrue" => array_key_exists("a", ["a" => 1]),
      "arrayKeyExistsFalse" => array_key_exists("z", ["a" => 1]),
      "checkdateValid" => checkdate(2, 29, 2024),
      "checkdateInvalid" => checkdate(2, 29, 2023),
      "gmdateEpoch" => gmdate("Y-m-d H:i:s", 0),
      "strtotimeUtc" => strtotime("1970-01-02 00:00:00 UTC"),
      "dateParseDateOnly" => date_parse("2024-02-29"),
      "dateParseOffset" => date_parse("2024-02-29T12:34:56+02:00"),
      "dateParseDoubleTimezone" => date_parse("2024-02-29T12:34:56+02:00 UTC"),
      "dateParseAlphaGarbage" => date_parse("abc"),
      "dateParsePunctuationGarbage" => date_parse("----"),
      "dateParseTrailingTimezoneGarbage" => date_parse("2024/02/29foo"),
      "dateParseInvalidDate" => date_parse("2024-02-30"),
      "dateParseZeroMonth" => date_parse("2024-00-01"),
      "dateParseFromFormatOk" => date_parse_from_format("Y-m-d H:i:s", "2024-02-29 12:34:56"),
      "dateParseFromFormatBad" => date_parse_from_format("Y-m-d", "2024/02/29"),
      "dateParseFromFormatBadTime" => date_parse_from_format("Y-m-d H:i:s", "2024-02-29 25:61:99"),
      "dateParseFromFormatBadDate" => date_parse_from_format("Y-m-d", "2024-02-30"),
      "trim" => trim("  hi  \n"),
      "explode" => explode(",", "a,b,c"),
      "strpos" => strpos("hello", "ll"),
      "substrCount" => substr_count("abababa", "aba"),
      "stripTags" => strip_tags("<p>Hello <b>World</b></p>", "<p>"),
      "parseUrlHttpsDefaultPort" => normalize_parse_url(parse_url("https://user:pass@example.com:443/a?b=1#c")),
      "parseUrlSchemeless" => normalize_parse_url(parse_url("//example.com/a")),
      "httpBuildQueryDefault" => http_build_query([
        "a" => "b c",
        "list" => ["x", "y"],
        "nested" => ["z" => 1],
        "nil" => null,
      ]),
      "httpBuildQueryRfc3986" => http_build_query([
        "list" => ["x", "y"],
      ], "", "&", PHP_QUERY_RFC3986),
      "newYorkDate" => (function () {
        date_default_timezone_set("America/New_York");
        return [
          "date0" => date("Y-m-d H:i:s", 0),
          "getdate0" => getdate(0),
          "mktimeEpoch" => mktime(0, 0, 0, 1, 1, 1970),
          "mktimeDstGap" => mktime(2, 30, 0, 3, 10, 2024),
        ];
      })(),
    ], JSON_UNESCAPED_SLASHES);
  `);

  eq("php parity array_keys()", PHP.Array.array_keys({ a: 1, b: 2 }), phpParity.arrayKeysAssoc);
  eq("php parity array_values()", PHP.Array.array_values({ a: 1, b: 2 }), phpParity.arrayValuesAssoc);
  eq("php parity array_merge() assoc", PHP.Array.array_merge({ a: 1 }, { b: 2 }), phpParity.arrayMergeAssoc);
  eq("php parity array_key_exists() true", PHP.Array.array_key_exists("a", { a: 1 }), phpParity.arrayKeyExistsTrue);
  eq("php parity array_key_exists() false", PHP.Array.array_key_exists("z", { a: 1 }), phpParity.arrayKeyExistsFalse);
  eq("php parity checkdate() valid", PHP.Date.checkdate(2, 29, 2024), phpParity.checkdateValid);
  eq("php parity checkdate() invalid", PHP.Date.checkdate(2, 29, 2023), phpParity.checkdateInvalid);
  eq("php parity gmdate()", PHP.Date.gmdate("Y-m-d H:i:s", 0), phpParity.gmdateEpoch);
  eq("php parity strtotime() UTC literal", PHP.Date.strtotime("1970-01-02 00:00:00 UTC"), phpParity.strtotimeUtc);
  eq("php parity date_parse() date only", PHP.Date.date_parse("2024-02-29"), phpParity.dateParseDateOnly);
  eq("php parity date_parse() offset", PHP.Date.date_parse("2024-02-29T12:34:56+02:00"), phpParity.dateParseOffset);
  eq("php parity date_parse() double timezone", PHP.Date.date_parse("2024-02-29T12:34:56+02:00 UTC"), phpParity.dateParseDoubleTimezone);
  eq("php parity date_parse() alpha garbage", PHP.Date.date_parse("abc"), phpParity.dateParseAlphaGarbage);
  eq("php parity date_parse() punctuation garbage", PHP.Date.date_parse("----"), phpParity.dateParsePunctuationGarbage);
  eq("php parity date_parse() trailing timezone garbage", PHP.Date.date_parse("2024/02/29foo"), phpParity.dateParseTrailingTimezoneGarbage);
  eq("php parity date_parse() invalid date", PHP.Date.date_parse("2024-02-30"), phpParity.dateParseInvalidDate);
  eq("php parity date_parse() zero month", PHP.Date.date_parse("2024-00-01"), phpParity.dateParseZeroMonth);
  eq("php parity date_parse_from_format() ok", PHP.Date.date_parse_from_format("Y-m-d H:i:s", "2024-02-29 12:34:56"), phpParity.dateParseFromFormatOk);
  eq("php parity date_parse_from_format() bad separators", PHP.Date.date_parse_from_format("Y-m-d", "2024/02/29"), phpParity.dateParseFromFormatBad);
  eq("php parity date_parse_from_format() invalid time", PHP.Date.date_parse_from_format("Y-m-d H:i:s", "2024-02-29 25:61:99"), phpParity.dateParseFromFormatBadTime);
  eq("php parity date_parse_from_format() invalid date", PHP.Date.date_parse_from_format("Y-m-d", "2024-02-30"), phpParity.dateParseFromFormatBadDate);
  eq("php parity trim()", PHP.String.trim("  hi  \n"), phpParity.trim);
  eq("php parity explode()", PHP.String.explode(",", "a,b,c"), phpParity.explode);
  eq("php parity strpos()", PHP.String.strpos("hello", "ll"), phpParity.strpos);
  eq("php parity substr_count()", PHP.String.substr_count("abababa", "aba"), phpParity.substrCount);
  eq("php parity strip_tags()", PHP.String.strip_tags("<p>Hello <b>World</b></p>", "<p>"), phpParity.stripTags);
  eq("php parity parse_url() explicit default port", PHP.Network.parse_url("https://user:pass@example.com:443/a?b=1#c"), phpParity.parseUrlHttpsDefaultPort);
  eq("php parity parse_url() schemeless host", PHP.Network.parse_url("//example.com/a"), phpParity.parseUrlSchemeless);
  eq("php parity http_build_query() default", PHP.Network.http_build_query({ a: "b c", list: ["x", "y"], nested: { z: 1 }, nil: null }), phpParity.httpBuildQueryDefault);
  eq("php parity http_build_query() RFC3986", PHP.Network.http_build_query({ list: ["x", "y"] }, "", "&", 2), phpParity.httpBuildQueryRfc3986);
  eq("php parity date() timezone aware", (() => {
    const tz = PHP.Date.date_default_timezone_get();
    PHP.Date.date_default_timezone_set("America/New_York");
    const out = PHP.Date.date("Y-m-d H:i:s", 0);
    PHP.Date.date_default_timezone_set(tz);
    return out;
  })(), phpParity.newYorkDate.date0);
  eq("php parity getdate() timezone aware", (() => {
    const tz = PHP.Date.date_default_timezone_get();
    PHP.Date.date_default_timezone_set("America/New_York");
    const out = PHP.Date.getdate(0);
    PHP.Date.date_default_timezone_set(tz);
    return out;
  })(), phpParity.newYorkDate.getdate0);
  eq("php parity mktime() timezone aware", (() => {
    const tz = PHP.Date.date_default_timezone_get();
    PHP.Date.date_default_timezone_set("America/New_York");
    const out = PHP.Date.mktime(0, 0, 0, 1, 1, 1970);
    PHP.Date.date_default_timezone_set(tz);
    return out;
  })(), phpParity.newYorkDate.mktimeEpoch);
  eq("php parity mktime() DST gap", (() => {
    const tz = PHP.Date.date_default_timezone_get();
    PHP.Date.date_default_timezone_set("America/New_York");
    const out = PHP.Date.mktime(2, 30, 0, 3, 10, 2024);
    PHP.Date.date_default_timezone_set(tz);
    return out;
  })(), phpParity.newYorkDate.mktimeDstGap);
} else {
  console.log("PHP CLI not available; skipping differential parity checks.");
}

// ---- serialize
eq("serialize/unserialize string", PHP.Serialize.unserialize(PHP.Serialize.serialize("hi")), "hi");

// ---- crypto (bcrypt)
const hash = PHP.Crypto.password_hash("secret", PHP.Crypto.PASSWORD_BCRYPT);
eq("password_verify bcrypt", PHP.Crypto.password_verify("secret", hash), true);
const hashDefault = PHP.Crypto.password_hash("secret", PHP.Crypto.PASSWORD_DEFAULT);
ok("PASSWORD_DEFAULT uses bcrypt prefix", hashDefault.startsWith("$2y$"));
eq("password_verify PASSWORD_DEFAULT", PHP.Crypto.password_verify("secret", hashDefault), true);
ok("password_hash() requires algo", (() => {
  try {
    PHP.Crypto.password_hash("secret");
    return false;
  } catch {
    return true;
  }
})());

// ---- chain
eq("chain() 1", chain("  hello world  ").trim().strtoupper().value(), "HELLO WORLD");
eq("chain() 2", chain(['A','b','c']).array_merge(['2',7]).implode().trim().strtoupper().value(), "ABC27");
eq("chain() 3", chain("ABc27XU ").strtolower().trim().explode().value(), ["abc27xu"]);
eq("chain().pipe()", chain("  hi ").trim().pipe((v) => v.toUpperCase()).value(), "HI");

// ---- file (directory handle)
const d = PHP.File.opendir(".");
ok("opendir()", d !== false);
const first = PHP.File.readdir(d);
ok("readdir() returns string|false", first === false || typeof first === "string");
PHP.File.rewinddir(d);
PHP.File.closedir(d);
ok("rewinddir()/closedir()", true);

// ---- session
const req = { headers: {} };
const res = {
  _headers: {},
  setHeader(key, value) { this._headers[key] = value; },
  getHeader(key) { return this._headers[key]; },
};

eq("session_start()", await PHP.Session.session_start(req, res), true);
const setCookie = res.getHeader("Set-Cookie");
ok("session_start() sets Set-Cookie", Array.isArray(setCookie) && setCookie.length > 0 && String(setCookie[0]).includes("PHPSESSID="));
PHP.Session.session_set("hello", "world");
eq("session_get()", PHP.Session.session_get("hello"), "world");
eq("session_write_close()", await PHP.Session.session_write_close(), true);

// ---- session isolation (concurrent requests)
const isolatedStore = new Map([
  ["sidA", JSON.stringify({ who: "A" })],
  ["sidB", JSON.stringify({ who: "B" })],
]);
PHP.Session.session_set_save_handler({
  open: async () => true,
  close: async () => true,
  read: async (sid) => isolatedStore.get(sid) ?? "",
  write: async (sid, data) => {
    isolatedStore.set(sid, data);
    return true;
  },
  destroy: async (sid) => {
    isolatedStore.delete(sid);
    return true;
  },
  gc: async () => true,
});

const reqA = { headers: { cookie: "PHPSESSID=sidA" } };
const reqB = { headers: { cookie: "PHPSESSID=sidB" } };
const resA = { setHeader() {}, getHeader() { return undefined; } };
const resB = { setHeader() {}, getHeader() { return undefined; } };

await Promise.all([
  (async () => {
    await PHP.Session.session_start(reqA, resA);
    await sleep(8);
    PHP.Session.session_set("owner", "request-A");
    await sleep(8);
    await PHP.Session.session_write_close();
  })(),
  (async () => {
    await PHP.Session.session_start(reqB, resB);
    await sleep(2);
    PHP.Session.session_set("owner", "request-B");
    await sleep(2);
    await PHP.Session.session_write_close();
  })(),
]);

const savedA = JSON.parse(isolatedStore.get("sidA") ?? "{}");
const savedB = JSON.parse(isolatedStore.get("sidB") ?? "{}");
eq("session isolation A", savedA.owner, "request-A");
eq("session isolation B", savedB.owner, "request-B");

// ---- session lock (same SID concurrent writes)
const sameSidStore = new Map([["sameSid", JSON.stringify({ count: 0 })]]);
PHP.Session.session_set_save_handler({
  open: async () => true,
  close: async () => true,
  read: async (sid) => sameSidStore.get(sid) ?? "",
  write: async (sid, data) => {
    sameSidStore.set(sid, data);
    return true;
  },
  destroy: async (sid) => {
    sameSidStore.delete(sid);
    return true;
  },
  gc: async () => true,
});

const sameReq1 = { headers: { cookie: "PHPSESSID=sameSid" } };
const sameReq2 = { headers: { cookie: "PHPSESSID=sameSid" } };
const sameRes1 = { setHeader() {}, getHeader() { return undefined; } };
const sameRes2 = { setHeader() {}, getHeader() { return undefined; } };

await Promise.all([
  (async () => {
    await PHP.Session.session_start(sameReq1, sameRes1);
    const n = PHP.Session.session_get("count", 0);
    await sleep(10);
    PHP.Session.session_set("count", n + 1);
    await PHP.Session.session_write_close();
  })(),
  (async () => {
    await PHP.Session.session_start(sameReq2, sameRes2);
    const n = PHP.Session.session_get("count", 0);
    PHP.Session.session_set("count", n + 1);
    await PHP.Session.session_write_close();
  })(),
]);

eq("session lock same SID", JSON.parse(sameSidStore.get("sameSid") ?? "{}").count, 2);

// ---- session id before start
const presetSidStore = new Map();
PHP.Session.session_set_save_handler({
  open: async () => true,
  close: async () => true,
  read: async (sid) => presetSidStore.get(sid) ?? "",
  write: async (sid, data) => {
    presetSidStore.set(sid, data);
    return true;
  },
  destroy: async (sid) => {
    presetSidStore.delete(sid);
    return true;
  },
  gc: async () => true,
});

const presetReq = { headers: {} };
const presetRes = { setHeader() {}, getHeader() { return undefined; } };
PHP.Session.session_id("preset-session-id");
eq("session_id() before start", PHP.Session.session_id(), "preset-session-id");
eq("session_start() honors preset session_id()", await PHP.Session.session_start(presetReq, presetRes), true);
eq("session_start() uses preset session id", PHP.Session.session_id(), "preset-session-id");
PHP.Session.session_set("source", "preset");
eq("session_write_close() preset session id", await PHP.Session.session_write_close(), true);
eq("preset session id persisted", JSON.parse(presetSidStore.get("preset-session-id") ?? "{}").source, "preset");

console.log("All tests passed.");
