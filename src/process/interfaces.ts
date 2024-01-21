import { THeaders } from "./types";


export interface IRequest {
    method: string;
    url: string;
    headers: THeaders;

    body?: string;
}

export interface IResponse {
    status: number;
    headers: THeaders;

    message?: string|Buffer;
}


export interface IFilestamp {
	data: Buffer;
	eTag: string;
}