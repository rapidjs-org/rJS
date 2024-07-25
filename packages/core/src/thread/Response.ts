import { THeaders, TSerializable, TStatus } from "../types";
import { ISerialResponse } from "../interfaces";


export class Response {
	private readonly headers: THeaders = {};

    private status: number = 200;
    private body?: TSerializable;
    
    public setHeader(name: string, value: string|readonly string[]) {
        const capitalizedName = name
        .toLowerCase()
        .replace(/(^|-)([a-z])/g, (_, delimiter, symbol) => `${delimiter}${symbol.toUpperCase()}`);
        this.headers[capitalizedName] = value;
    }

    public setBody(body: TSerializable) {
        this.body = body;
    }
    
    public serialize(): ISerialResponse {
        return {
            status: this.status as TStatus,
            headers: this.headers,
            body: this.body
        };
    }
}