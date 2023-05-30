/**
 * Manifold influential data structure interfaces.
 */


import { TCookies, THeaders, TLocale, TUrl } from "./types";


export interface IRuntimeMode {
    DEV: boolean;
    PROD: boolean;
}


export interface IBasicRequest {
    headers: THeaders;
    hostname: string;
    method: string;
    url: string;
}

export interface IRequest {
    method: string;
    headers: THeaders;
    url: TUrl;
    ip: string;
    
    body?: unknown
    cookies?: TCookies;
    locale?: TLocale;
}

export interface IResponse {
    status: number;
    
    cookies?: TCookies;
    headers?: THeaders;
    message?: string|number|boolean|Buffer;
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

export interface IHighlevelCookie {
    value: string|number|boolean;
    
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    sameSite?: string;
}


export interface IFileStamp {
    ETag: string;
    data: string|Buffer;
}