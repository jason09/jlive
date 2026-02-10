/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Chain<T = any> {
  /** Returns the wrapped value */
  value(): T;
  /** Apply a function to the wrapped value */
  pipe<R>(fn: (value: T) => R): Chain<R>;
  /** Tap into the value without changing it */
  tap(fn: (value: T) => void): Chain<T>;

  // String methods (available when T is string)
  //trim(charMask?: string): Chain<any>;
  //strtolower(): Chain<any>;
  //strtoupper(): Chain<any>;
  //substr(start: number, length?: number): Chain<any>;
  //str_replace(search: any, replace: any, subject?: any, count?: any): Chain<any>;
  //explode(delimiter: string, string: string, limit?: number): Chain<any>;
  // Array methods
  //array_map(callback: any, array: any, ...arrays: any[]): Chain<any>;
  //array_filter(array: any, callback?: any, mode?: number): Chain<any>;
  //array_unique(array: any): Chain<any>;
}

export function chain<T>(value: T): Chain<T>;

export namespace PHP {
  export const Variables: Record<string, any>;
  export const String: Record<string, any>;
  export const Array: Record<string, any>;
  export const Math: Record<string, any>;
  export const Date: Record<string, any>;
  export const DateTime: Record<string, any>;
  export const JSON: Record<string, any>;
  export const Crypto: Record<string, any>;
  export const Preg: Record<string, any>;
  export const Serialize: Record<string, any>;
  export const Locale: Record<string, any>;
  export const Network: Record<string, any>;
  export const Cookie: Record<string, any>;
  export const Session: Record<string, any>;
  export const File: Record<string, any>;
}

/**
 * Flat PHP-like namespace (backward compatible with older jLive versions).
 */
export const JlivePHP: Record<string, any> & { foreach: (value: any[]|Record<string, any>, callback: (item:any, key:any, source:any)=>void) => void };
export const JliveFile: Record<string, any>;
export const JliveEncrypt: Record<string, any>;
