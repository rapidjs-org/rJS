export type THTTPMethod = "GET" | "POST" | "HEAD";
export type THeaders = { [ name: string ]: TSerializable|readonly TSerializable[]; }
export type TStatus = 200 | 301 | 302 | 304 | 404 | 405 | 413 | 414 | 429 | 431 | 500;
export type TSerializable = Buffer|string|number|boolean;
export type TJSON = { [ key: string ]: TJSON|string|number|boolean; };