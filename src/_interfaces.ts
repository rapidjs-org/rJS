import { THeaders } from "./_types";


export interface IProxyIPCPackage {
    command: string;
    arg: unknown;
}


export interface IEmbed {
    ARGS: string[];
    HOSTNAME: string;
    MODE: string;
    PATH: string;
    PORT: number;
    SHELL: string;
}


export interface IBareRequest {
    method: string;
    url: string;
    headers: THeaders;
}

export interface IRequest {
    ip: string;
    method: string;
    url: IHighlevelURL;
    headers: THeaders;
    
    body?: unknown;
    cookies?: THighlevelCookieIn;
    encoding: IHighlevelEncoding[];
    locale?: IHighlevelLocale[];
}

export interface IResponse {
    status: number;
    
    headers?: THeaders;
    message?: string|number|boolean|Buffer;
    cookies?: Record<string, IHighlevelCookieOut>;
}


export interface IHighlevelURL {
    /* hash: string;
    host: string;
    hostname: string;
    href: string;
    origin: string;
    password: string;
    pathname: string;
    port: string;
    protocol: string;
    search: string;
    username: string;
    searchParams: Record<string, string>; */
}

export interface IHighlevelEncoding {
    type: string;
    quality: number;
}

export interface IHighlevelLocale {
    language: string;
    quality: number;

    region?: string;
}

export type THighlevelCookieIn = Record<string, string|number|boolean>;

export interface IHighlevelCookieOut {
    value: string|number|boolean;
    
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    sameSite?: string;
}