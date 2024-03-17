export type TJSON = { [ key: string ]: string|number|boolean|TJSON };

export type TProtocol = "HTTP" | "HTTPS";

export type THeaders = { [ key: string ]: string; };

export type TStatusCode = number;