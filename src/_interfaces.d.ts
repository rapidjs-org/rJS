import { THeaders } from "./_types";


export interface IProxyIPCPackage {
    command: string;
    arg: unknown;
}

export interface IBasicRequest {
    method: string;
    url: string;
    headers: THeaders;
}