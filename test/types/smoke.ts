import { chain, JliveEncrypt, JliveFile, JlivePHP, PHP } from "../../index.js";

const up: string = PHP.String.strtoupper("abc");
const sum: number = PHP.Array.array_sum([1, 2, 3]);
const contains: boolean = JlivePHP.str_contains("hello", "ell");
const verified: boolean = JliveEncrypt.password_verify("secret", JliveEncrypt.password_hash("secret", JliveEncrypt.PASSWORD_BCRYPT));
const exists: boolean = JliveFile.file_exists(".");
const joined: string = chain(["a", "b"]).implode(",").value();
const position: number | false = chain("hello").strpos("e").value();

const chained: string = chain("  hello world  ")
  .trim()
  .str_replace("world", "jLive")
  .pipe((value) => String(value).toUpperCase())
  .value();

const out = { up, sum, contains, verified, exists, joined, position, chained };
void out;
