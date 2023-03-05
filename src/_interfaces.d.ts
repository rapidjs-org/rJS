/**
 * Manifold influential data structure interfaces.
 */


import { THeaders, THighlevelCookieIn } from "./_types";


export interface IProxyIPCPackage {
    command: string;
    arg: unknown;
}


export interface IBasicRequest {
    method: string;
    headers: THeaders;
    url: string;
}


export interface IRequest {
    method: string;
    headers: THeaders;
    url: IHighlevelURL;
    ip: string;
    
    body?: unknown
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
    hash: string;
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
    searchParams: Record<string, string>;
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

export interface IHighlevelCookieOut {
    value: string|number|boolean;
    
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    sameSite?: string;
}