import { TSerializable, TStatus } from "@common/types";

import { THTTPMethod, THeaders } from "./types";


export interface ISerialRequest {
    method: THTTPMethod;
    url: string;
    headers: THeaders;

    body?: Buffer|TSerializable;
    clientIP?: string;
}

export interface ISerialResponse {
    status: TStatus;
    headers: THeaders;

    body?: TSerializable;
}