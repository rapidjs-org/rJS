import EventEmitter from "events";
import zlib from "zlib";

import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { TypeResolver } from "../TypeResolver";
import { Request } from "../Request";
import { Response } from "../Response";

// TODO: i18n (?)

const ENCODERS: { [key: string]: (data: unknown) => Buffer } = Object.freeze({
    identity: (data: unknown) => data as Buffer,
    gzip: zlib.gzipSync,
    deflate: zlib.deflateSync,
    br: zlib.brotliCompressSync
});

export abstract class AHandlerContext extends EventEmitter {
    protected readonly request: Request;
    protected readonly response: Response;
    protected readonly config: TypeResolver;
    protected readonly dev: boolean;

    private hasConsumedResponse: boolean = false;

    constructor(sReq: ISerialRequest, config: TypeResolver, dev: boolean) {
        super();

        this.request = new Request(sReq);
        this.response = new Response();

        this.config = config;
        this.dev = dev;
    }

    public respond() {
        if (this.hasConsumedResponse)
            throw new RangeError("Response consumed multiple times");
        this.hasConsumedResponse = true;

        if (
            this.response.hasCompressableBody &&
            ((this.response.getBody() ?? "") as Buffer).toString().length >
                this.config
                    .read("performance", "compressionByteThreshold")
                    .number()
        ) {
            const encoding: string =
                this.request
                    .getWeightedHeader("Accept-Encoding")
                    .filter((encoder: string) => ENCODERS[encoder])
                    .shift() ?? "identity";

            this.response.setBody(ENCODERS[encoding](this.response.getBody()));
            this.response.setHeader("Content-Encoding", encoding);
        }

        const sRes: { body: Buffer } & ISerialResponse =
            this.response.serialize();

        // Common headers
        const bodyLength: number = sRes.body ? Buffer.byteLength(sRes.body) : 0;
        this.response.setHeader("Content-Length", bodyLength.toString());
        this.response.setHeader("Connection", "keep-alive");
        this.response.setHeader("Keep-Alive", "timeout=5");
        this.response.setHeader(
            "Cache-Control",
            !this.dev
                ? [
                      `max-age=${this.config.read("performance", "clientCacheMs").number()}`,
                      "stale-while-revalidate=300",
                      "must-revalidate"
                  ]
                : "no-store"
        );

        this.emit("response", sRes);
    }

    public abstract process(): void;
}
