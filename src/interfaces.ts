import { THeaders, TProtocol } from "./types";


export interface IContextEmbed {
    cwd?: string;
    args?: string[];
	protocol?: TProtocol;
	hostnames?: string[];
	port?: number;
	clustered?: boolean;
}


export interface IHTTPMessage {
    version: string;
    protocol: string;
    method: string;
    url: string;
    headers: THeaders;
    body: string|null;
}


export interface IRequest {
    method: string;
    url: string;
    headers: THeaders;
    clientIP: string;

    body?: string;
}

export interface IResponse {
    status: number;
    headers: THeaders;

    message?: string|Buffer;
}


export interface IProxyMonitor {
    port: number;
}