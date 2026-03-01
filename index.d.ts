/* eslint-disable @typescript-eslint/no-explicit-any */

export class Chain<T = any> {
  /** Returns the wrapped value */
  value(): T;
  /** Apply a function to the wrapped value */
  pipe<R>(fn: (value: T) => R): Chain<R>;
  /** Tap into the value without changing it */
  tap(fn: (value: T) => void): Chain<T>;
  /** Auto-generated chain methods (string/array/etc.) */
  [method: string]: any;
}

export function chain<T>(value: T): Chain<T>;

type PhpModule = Record<string, any>;

export type PHPNamespace = Readonly<{
  Variables: PhpModule;
  String: PhpModule;
  Array: PhpModule;
  Math: PhpModule;
  Date: PhpModule;
  DateTime: PhpModule;
  JSON: PhpModule;
  Crypto: PhpModule;
  Preg: PhpModule;
  Serialize: PhpModule;
  Locale: PhpModule;
  Network: PhpModule;
  Cookie: PhpModule;
  Session: PhpModule;
  File: PhpModule;
}>;

export const PHP: PHPNamespace;

/**
 * Flat PHP-like namespace (backward compatible with older jLive versions).
 */
export type JliveFlat = PhpModule & {
  foreach: (value: any[] | Record<string, any>, callback: (item: any, key: any, source: any) => void) => any;
};

export const JlivePHP: JliveFlat;
export const JliveFile: PhpModule;
export const JliveEncrypt: PhpModule;
