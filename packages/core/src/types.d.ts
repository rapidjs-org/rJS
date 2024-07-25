export type THTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type THeaders = { [ name: string ]: string|readonly string[]; }
export type TStatus = 200 | 404 | 500;
export type TSerializable = Buffer|string|number|boolean;
export type TJSON = { [ key: string ]: TJSON|string|number|boolean; };