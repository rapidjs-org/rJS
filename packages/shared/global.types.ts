export type TJSON = { [ key: string ]: TJSON|string|number|boolean; };
export type TPrimitive = string|number|boolean;
export type TAtomicSerializable = |
  Buffer
| Uint8Array
| TPrimitive;
export type TSerializable = TAtomicSerializable
| {
  [ key: string ]: TSerializable|readonly TSerializable[];
};

export type THTTPMethod = "GET" | "HEAD" | "POST" | "PUT";
export type THeaders = {
  [ name: string ]: TAtomicSerializable|readonly TAtomicSerializable[];
}
export type TStatus = 
  200
| 301 | 304
| 400 | 403 | 404 | 405 | 408 | 413 | 414 | 429 | 431
| 500;