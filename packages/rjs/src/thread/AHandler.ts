import EventEmitter from "events";
import zlib from "zlib";

import { TSerializable } from "../types";
import { ISerialRequest, ISerialResponse } from "../interfaces";
import { Request } from "./Request";
import { Response } from "./Response";
import { Config } from "../stateless/Config";


// TODO: i18n

const ENCODERS: { [ key: string ]: ((data: unknown) => Buffer) } = Object.freeze({
	"identity": (data: unknown) => data as Buffer,
	"gzip": zlib.gzipSync,
	"deflate": zlib.deflateSync,
	"br": zlib.brotliCompressSync
});


export abstract class AHandler extends EventEmitter {
    protected readonly request: Request;
    protected readonly response: Response;
    
    private hasConsumedResponse: boolean = false;

    constructor(sReq: ISerialRequest) {
        super();
        
        this.request = new Request(sReq);
        this.response = new Response();
    }
    
    public respond() {
        if(this.hasConsumedResponse) throw new RangeError("Response consumed multiple times");
        this.hasConsumedResponse = true;

        if(this.response.hasCompressableBody
        && (this.response.getBody() ?? "").toString().length > Config.global.read("performance", "compressionByteThreshold").number()) {
            const encoding: string = this.request
                .getWeightedHeader("Accept-Encoding")
                .filter((encoder: string) => ENCODERS[encoder])
                .shift()
            ?? "identity";

			this.response.setBody(ENCODERS[encoding](this.response.getBody()));
			this.response.setHeader("Content-Encoding", encoding);
        }
        
        const sResponse: ISerialResponse = this.response.serialize();
        
        // Common headers
        this.response.setHeader("Content-Length", Buffer.byteLength(sResponse.body ?? ""));
        this.response.setHeader("Connection", "keep-alive");
        this.response.setHeader("Cache-Control", [
            `max-age=${Config.global.read("performance", "clientCacheMs").number()}`,
            "stale-while-revalidate=300",
            "must-revalidate"
        ].join(", "));
        
        this.emit("response", sResponse);
    }

    public abstract process(): void;
}