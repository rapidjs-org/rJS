import { THTTPMethod, THeaders, TStatus, TSerializable } from "./global.types";

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
    
    body?: Buffer|TSerializable;
}