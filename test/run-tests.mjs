import { PHP, chain, JlivePHP } from "../index.js";

function ok(label, cond) {
  if (!cond) throw new Error(`❌ ${label}`);
  console.log(`${label}`);
}

function eq(label, a, b) {
  const same =
    (Number.isNaN(a) && Number.isNaN(b)) ||
    (typeof a === "object" && typeof b === "object"
      ? JSON.stringify(a) === JSON.stringify(b)
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

console.log("All tests passed.");
