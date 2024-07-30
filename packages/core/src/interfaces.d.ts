import { THTTPMethod, THeaders, TStatus } from "./types";


export interface ISerialRequest {
    method: THTTPMethod;
    url: string;
    headers: THeaders;
    
    body?: string;
    clientIP?: string;
}

export interface ISerialResponse {
    status: TStatus;
    headers: THeaders;
    
    body?: Buffer;
}

export interface IFilestamp {
	data: Buffer|string;
	eTag: string;
}