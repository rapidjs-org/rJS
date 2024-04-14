import { EventEmitter } from "events";
import { URL } from "url";

import { TSerializable, TStatus } from "@common/types";

import { ISerialRequest, ISerialResponse } from "./interfaces";
import { THeader, THeaders } from "./types";

import _config from "./_config.json";


class HeadersMap {
    private normalizedHeadersObj: THeaders = {};

    constructor(headersObj: THeaders) {
        Object.entries(headersObj)
        .forEach((entry: [ string, string ]) => {
            this.normalizedHeadersObj[entry[0].toLowerCase()] = entry[1];
        });
    }

    get(name: string): THeader {
        return this.normalizedHeadersObj[name.toLowerCase()];
    }
}


export abstract class Response extends EventEmitter {
    private wasConsumed: boolean = false;

    // From request
    protected url: URL;
    protected searchParams: URLSearchParams;
    protected headers: HeadersMap;

    // For response
    private serialResponse: ISerialResponse = {
        status: 200,
        headers: {}
    };

    constructor(serialRequest?: ISerialRequest) {
        super();
        
        this.setHeader("Server", _config.appIdentifier);

        if(!serialRequest) return;

        this.headers = new HeadersMap(serialRequest.headers);

        /* this.url = new URL(
            serialRequest.url
            .replace(/^(\.{0,2}\/)/, "localhost/$1")
            .replace(/^(https?:\/\/)/, )
        ); */
    }

    public abstract process(): void;
    
    public abstract process(): void;
    
    protected close() {
        if(this.wasConsumed) throw new RangeError("Attempt to close already consumed response again");

        this.emit("end", this.serialResponse);

        this.wasConsumed = true;
    }
    
    protected setHeader(name: string, value: string|readonly string[]) {
        const capitalizedName = name
        .toLowerCase()
        .replace(/(^|-)([a-z])/g, (_, delimiter, symbol) => `${delimiter}${symbol.toUpperCase()}`);
        this.serialResponse.headers[capitalizedName] = value;
    }
    
    protected setBody(body: TSerializable) {
        this.serialResponse.body = body;
    }
    
    protected setStatus(status: TStatus) {
        this.serialResponse.status = status;
    }
}