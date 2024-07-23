export type THTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type THeader = string|readonly string[];
export type THeaders = { [ name: string ]: THeader; }
export type TStatus = 200 | 404;