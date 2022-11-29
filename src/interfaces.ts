import { THeaders } from "./types";


export interface ISpaceEnv {
    PATH: string;
    MODE: {
        DEV: boolean;
        PROD: boolean;
    };
}


export interface IRequest {
    method: string;
    url: IHighlevelURL;
    headers: THeaders;
    
    body?: unknown;
    cookies?: THighlevelCookieIn;
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