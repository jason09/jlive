/**
 * PHP-like filesystem helpers for Node.js.
 * @module php/file
 */

import fs from "node:fs";
import path from "node:path";
import { assertArity, assertBoolean, assertNumber, assertString, typeError } from "../internal/assert.js";


/** PHP constants for scandir sorting */
export const SCANDIR_SORT_ASCENDING = 0;
export const SCANDIR_SORT_DESCENDING = 1;
export const SCANDIR_SORT_NONE = 2;

/**
 * Directory handle (PHP-like Directory class).
 * Returned by dir() and opendir().
 *
 * @see https://www.php.net/manual/en/class.directory.php
 */
export class Directory {
  /**
   * @param {string} dirPath
   * @param {fs.Dir} dir
   */
  constructor(dirPath, dir) {
    /** @type {string} */
    this.path = dirPath;

    /** @type {fs.Dir} */
    this._dir = dir;

    /** @type {fs.Dirent[]|null} */
    this._entries = null;

    /** @type {number} */
    this._idx = 0;

    /** @type {boolean} */
    this._closed = false;
  }

  /** @private */
  _ensureLoaded() {
    if (this._entries !== null) return;

    /** @type {fs.Dirent[]} */
    const out = [];

    // Node 24+ supports dir.readSync()
    // @ts-ignore
    if (typeof this._dir.readSync === "function") {
      // @ts-ignore
      for (;;) {
        // @ts-ignore
        const ent = this._dir.readSync();
        if (!ent) break;
        out.push(ent);
      }
    } else {
      // fallback
      out.push(...fs.readdirSync(this.path, { withFileTypes: true }));
    }

    this._entries = out;
    this._idx = 0;
  }

  /**
   * Read next entry name from directory.
   * Returns filename string or false when no more entries.
   *
   * @returns {string|false}
   * @throws {Error} if handle is closed
   * @see https://www.php.net/manual/en/directory.read.php
   */
  read() {
    if (this._closed) throw new Error("Directory.read(): directory is closed");
    this._ensureLoaded();

    // @ts-ignore
    if (this._idx >= this._entries.length) return false;

    // @ts-ignore
    return this._entries[this._idx++].name;
  }

  /**
   * Rewind directory handle back to first entry.
   *
   * @returns {void}
   * @throws {Error} if handle is closed
   * @see https://www.php.net/manual/en/directory.rewind.php
   */
  rewind() {
    if (this._closed) throw new Error("Directory.rewind(): directory is closed");
    this._ensureLoaded();
    this._idx = 0;
  }

  /**
   * Close directory handle.
   *
   * @returns {void}
   * @see https://www.php.net/manual/en/directory.close.php
   */
  close() {
    if (this._closed) return;
    try {
      this._dir.closeSync();
    } finally {
      this._closed = true;
    }
  }
}

/**
 * Open a directory handle (PHP-like dir()).
 *
 * PHP signature: dir(string $directory, resource $context = null): Directory|false
 *
 * @param {string} directory
 * @returns {Directory|false}
 * @throws {TypeError}
 * @see https://www.php.net/manual/en/function.dir.php
 */
export function dir(directory) {
  if (typeof directory !== "string") {
    throw new TypeError(`dir(): Argument #1 ($directory) must be of type string, ${typeof directory} given`);
  }

  const p = directory.length ? directory : ".";
  try {
    const resolved = path.resolve(p);
    const st = fs.statSync(resolved);
    if (!st.isDirectory()) return false;

    const d = fs.opendirSync(resolved);
    return new Directory(resolved, d);
  } catch {
    return false;
  }
}


/**
 * Open directory handle.
 *
 * PHP signature: opendir(string $directory, resource $context = null): resource|false
 * Here we return Directory (resource-like).
 *
 * @param {string} directory
 * @returns {Directory|false}
 * @throws {TypeError}
 * @see https://www.php.net/manual/en/function.opendir.php
 */
export function opendir(directory) {

  assertArity("directory", arguments, 1, 1);
  assertString('directory', 1, directory);  

  const p = directory.length ? directory : ".";
  try {
    const resolved = path.resolve(p);
    const st = fs.statSync(resolved);
    if (!st.isDirectory()) return false;

    const d = fs.opendirSync(resolved);
    return new Directory(resolved, d);
  } catch {
    return false;
  }
}

/**
 * Read an entry from a directory handle.
 *
 * PHP signature: readdir(resource $dir_handle = null): string|false
 *
 * @param {Directory} dir_handle
 * @returns {string|false}
 * @throws {TypeError}
 * @see https://www.php.net/manual/en/function.readdir.php
 */
export function readdir(dir_handle) {
  assertArity("readdir", arguments, 1, 1);
  assertDirectory('readdir', 1, dir_handle);
  return dir_handle.read();
}

/**
 * Close directory handle.
 *
 * PHP signature: closedir(resource $dir_handle = null): void
 *
 * @param {Directory} dir_handle
 * @returns {void}
 * @throws {TypeError}
 * @see https://www.php.net/manual/en/function.closedir.php
 */
export function closedir(dir_handle) {
  assertDirectory('closedir', 1, dir_handle);
  dir_handle.close();
}

/**
 * Rewind directory handle.
 *
 * PHP signature: rewinddir(resource $dir_handle = null): void
 *
 * @param {Directory} dir_handle
 * @returns {void}
 * @throws {TypeError}
 * @see https://www.php.net/manual/en/function.rewinddir.php
 */
export function rewinddir(dir_handle) {
  assertDirectory('rewinddir', 1, dir_handle);
  dir_handle.rewind();
}

/**
 * List files and directories inside the specified path.
 *
 * PHP signature:
 * scandir(string $directory, int $sorting_order = SCANDIR_SORT_ASCENDING,
 *         resource $context = null): array|false
 *
 * @param {string} directory
 * @param {number} [sorting_order=SCANDIR_SORT_ASCENDING]
 * @returns {string[]|false}
 * @throws {TypeError}
 * @see https://www.php.net/manual/en/function.scandir.php
 */
export function scandir(directory = ".", sorting_order = SCANDIR_SORT_ASCENDING) {

  assertString("scandir", 2, directory);
  assertNumber("scandir", 2, sorting_order);

  try {
    const resolved = path.resolve(directory.length ? directory : ".");
    const st = fs.statSync(resolved);
    if (!st.isDirectory()) return false;

    // PHP includes "." and ".." in scandir results
    const names = fs.readdirSync(resolved);
    /** @type {string[]} */
    const out = [".", "..", ...names];

    if (sorting_order === SCANDIR_SORT_NONE) return out;

    // PHP sorts in byte-order; JS uses Unicode. This is close enough for most cases.
    out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    if (sorting_order === SCANDIR_SORT_DESCENDING) out.reverse();

    return out;
  } catch {
    return false;
  }
}

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
