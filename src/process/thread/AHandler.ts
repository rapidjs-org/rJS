import { gzipSync, brotliCompressSync, deflateSync } from "zlib";
import { EventEmitter } from "stream";

import { Request } from "./Request";
import { Response } from "./Response";
import { HeaderParser } from "./HeaderParser";


const ENCODERS: { [ key: string ]: ((data: unknown) => Buffer) } = Object.freeze({
    "identity": (data: unknown) => data as Buffer,
    "gzip": gzipSync,
    "deflate": deflateSync,
    "br": brotliCompressSync
});


export abstract class AHandler extends EventEmitter {
    protected readonly req: Request;
    protected readonly res: Response = new Response();

    private hasConsumedResponse: boolean = false;

    constructor(req: Request) {
        super();

        this.req = req;
    }

    protected respond() {
        if(this.hasConsumedResponse) throw new RangeError("Attempt to consume response twice");

        // ENCODING
        const acceptedEncodings: string[] = HeaderParser.qualitySyntax(this.req.getHeader("Accept-Encoding"));
        for(let acceptedEncoding in acceptedEncodings) {
            if(!(acceptedEncoding in ENCODERS)) continue;
            this.res.setMessage(ENCODERS[acceptedEncoding](this.res.message));
            // TODO: Do not compress everything (JPG, binary, etc.)
            this.res.setHeader("Content-Encoding", acceptedEncoding);
            break;
        }

        this.emit("respond", this.res.serialize());

        this.hasConsumedResponse = true;
    }
    
    public abstract activate(): void;
}