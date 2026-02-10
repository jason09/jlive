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

// ---- serialize
eq("serialize/unserialize string", PHP.Serialize.unserialize(PHP.Serialize.serialize("hi")), "hi");

// ---- crypto (bcrypt)
const hash = PHP.Crypto.password_hash("secret", PHP.Crypto.PASSWORD_BCRYPT);
eq("password_verify bcrypt", PHP.Crypto.password_verify("secret", hash), true);

// ---- chain
eq("chain() 1", chain("  hello world  ").trim().strtoupper().value(), "HELLO WORLD");
eq("chain() 2", chain(['A','b','c']).array_merge(['2',7]).implode().trim().strtoupper().value(), "ABC27");
eq("chain() 3", chain("ABc27XU ").strtolower().trim().explode().value(), ["abc27xu"]);

console.log("All tests passed.");
