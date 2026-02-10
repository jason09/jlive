/**
 * PHP-like filesystem helpers for Node.js.
 * @module php/file
 */

import fs from "node:fs";
import path from "node:path";
import { assertArity, assertBoolean, assertNumber, assertString, typeError } from "../internal/assert.js";

export function file_exists(filename) {
  assertArity("file_exists", arguments, 1, 1);
  assertString("file_exists", 1, filename);
  return fs.existsSync(filename);
}

export function is_dir(filename) {
  assertArity("is_dir", arguments, 1, 1);
  assertString("is_dir", 1, filename);
  try {
    return fs.statSync(filename).isDirectory();
  } catch {
    return false;
  }
}

export function is_file(filename) {
  assertArity("is_file", arguments, 1, 1);
  assertString("is_file", 1, filename);
  try {
    return fs.statSync(filename).isFile();
  } catch {
    return false;
  }
}

export function is_link(filename) {
  assertArity("is_link", arguments, 1, 1);
  assertString("is_link", 1, filename);
  try {
    return fs.lstatSync(filename).isSymbolicLink();
  } catch {
    return false;
  }
}

export function filesize(filename) {
  assertArity("filesize", arguments, 1, 1);
  assertString("filesize", 1, filename);
  return fs.statSync(filename).size;
}

export function fopen(filename, mode = "r") {
  assertArity("fopen", arguments, 1, 2);
  assertString("fopen", 1, filename);
  assertString("fopen", 2, mode);
  // Node returns an fd number
  return fs.openSync(filename, mode);
}

export function fread(handle, length) {
  assertArity("fread", arguments, 2, 2);
  if (typeof handle !== "number") typeError("fread", 1, "resource", handle);
  if (typeof length !== "number") typeError("fread", 2, "int", length);
  const buf = Buffer.alloc(length);
  const bytesRead = fs.readSync(handle, buf, 0, length, null);
  return buf.subarray(0, bytesRead).toString("utf8");
}

export function fwrite(handle, string) {
  assertArity("fwrite", arguments, 2, 2);
  if (typeof handle !== "number") typeError("fwrite", 1, "resource", handle);
  assertString("fwrite", 2, string);
  return fs.writeSync(handle, string, undefined, "utf8");
}

export function fclose(handle) {
  assertArity("fclose", arguments, 1, 1);
  if (typeof handle !== "number") typeError("fclose", 1, "resource", handle);
  fs.closeSync(handle);
  return true;
}

export function file_get_contents(filename) {
  assertArity("file_get_contents", arguments, 1, 1);
  assertString("file_get_contents", 1, filename);
  return fs.readFileSync(filename, "utf8");
}

export function file_put_contents(filename, data) {
  assertArity("file_put_contents", arguments, 2, 2);
  assertString("file_put_contents", 1, filename);
  if (typeof data !== "string" && !Buffer.isBuffer(data)) typeError("file_put_contents", 2, "string", data);
  fs.writeFileSync(filename, data);
  return Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
}

export function mkdir(pathname, mode = 0o777, recursive = false) {
  assertArity("mkdir", arguments, 1, 3);
  assertString("mkdir", 1, pathname);
  if (mode !== undefined && typeof mode !== "number") typeError("mkdir", 2, "int", mode);
  if (recursive !== undefined) assertBoolean("mkdir", 3, recursive);
  fs.mkdirSync(pathname, { mode, recursive });
  return true;
}

export function unlink(filename) {
  assertArity("unlink", arguments, 1, 1);
  assertString("unlink", 1, filename);
  fs.unlinkSync(filename);
  return true;
}

export function rmdir(dirname) {
  assertArity("rmdir", arguments, 1, 1);
  assertString("rmdir", 1, dirname);
  fs.rmdirSync(dirname);
  return true;
}

export function copy(source, dest) {
  assertArity("copy", arguments, 2, 2);
  assertString("copy", 1, source);
  assertString("copy", 2, dest);
  fs.copyFileSync(source, dest);
  return true;
}

export function rename(oldname, newname) {
  assertArity("rename", arguments, 2, 2);
  assertString("rename", 1, oldname);
  assertString("rename", 2, newname);
  fs.renameSync(oldname, newname);
  return true;
}

export function fstat(handle) {
  assertArity("fstat", arguments, 1, 1);
  if (typeof handle !== "number") typeError("fstat", 1, "resource", handle);
  return fs.fstatSync(handle);
}

export function pathinfo(p, options = "PATHINFO_ALL") {
  assertArity("pathinfo", arguments, 1, 2);
  assertString("pathinfo", 1, p);
  const parsed = path.parse(p);
  const all = {
    dirname: parsed.dir,
    basename: parsed.base,
    extension: parsed.ext.startsWith(".") ? parsed.ext.slice(1) : parsed.ext,
    filename: parsed.name,
  };
  switch (options) {
    case "PATHINFO_ALL":
      return all;
    case "PATHINFO_DIRNAME":
      return all.dirname;
    case "PATHINFO_BASENAME":
      return all.basename;
    case "PATHINFO_EXTENSION":
      return all.extension;
    case "PATHINFO_FILENAME":
      return all.filename;
    default:
      return all;
  }
}

/**
 * basename(path [, suffix])
 * @param {string} p
 * @param {string} [suffix]
 */
export function basename(p, suffix = "") {
  assertArity("basename", arguments, 1, 2);
  assertString("basename", 1, p);
  if (suffix !== undefined) assertString("basename", 2, suffix);
  const b = path.basename(p);
  return suffix && b.endsWith(suffix) ? b.slice(0, -suffix.length) : b;
}

/**
 * dirname(path)
 * @param {string} p
 */
export function dirname(p) {
  assertArity("dirname", arguments, 1, 1);
  assertString("dirname", 1, p);
  return path.dirname(p);
}

/**
 * realpath(path)
 * @param {string} p
 */
export function realpath(p) {
  assertArity("realpath", arguments, 1, 1);
  assertString("realpath", 1, p);
  return fs.realpathSync(p);
}

/**
 * glob(pattern) (very small subset: supports * and ? in a single directory)
 * @param {string} pattern
 * @returns {string[]}
 */
export function glob(pattern) {
  assertArity("glob", arguments, 1, 1);
  assertString("glob", 1, pattern);
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  const re = new RegExp("^" + base.replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "u");
  const list = fs.readdirSync(dir === "." ? process.cwd() : dir);
  return list.filter((n) => re.test(n)).map((n) => path.join(dir, n));
}

/**
 * scandir(path)
 * @param {string} dir
 * @returns {string[]}
 */
export function scandir(dir) {
  assertArity("scandir", arguments, 1, 1);
  assertString("scandir", 1, dir);
  return fs.readdirSync(dir);
}
