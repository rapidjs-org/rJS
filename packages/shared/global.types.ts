export type TJSON = { [ key: string ]: TJSON|string|number|boolean; };
export type TSerializable = Buffer|Uint8Array|string|number|boolean;

export type THTTPMethod = "GET" | "POST" | "HEAD";
export type THeaders = { [ name: string ]: TSerializable|readonly TSerializable[]; }
export type TStatus = 200
| 301 | 304
| 400 | 404 | 405 | 408 | 413 | 414 | 429 | 431
| 500;