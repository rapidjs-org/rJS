import { gzipSync, brotliCompressSync, deflateSync } from "zlib";
import { EventEmitter } from "stream";

import { Request } from "./Request";
import { Response } from "./Response";
import { HeaderParser } from "./HeaderParser";
import { Context } from "../common/Context";


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
		
		setTimeout(() => {
			this.emit("timeout");
		}, 1000 ?? Context.CONFIG.get<number>("timeout"));
	}

	protected respond() {
		if(this.hasConsumedResponse) throw new RangeError("Attempt to consume response twice");

		// ENCODING
		if(!Buffer.isBuffer(this.res.message)) {
			const encoding: string = HeaderParser
			.qualitySyntax(this.req.getHeader("Accept-Encoding"))
			.filter((encoder: string) => ENCODERS[encoder])
			.shift();

			if(this.res.message && encoding) {
				this.res.setMessage(ENCODERS[encoding](this.res.message));
				this.res.setHeader("Content-Encoding", encoding);
			} else {
				this.res.setMessage(Buffer.from(this.res.message ?? "", "utf-8"));
			}
		}
		
		this.res.setHeader("Content-Length", Buffer.byteLength(this.res.message));
		
		this.emit("respond", this.res.serialize());
		
		this.hasConsumedResponse = true;
	}

    public abstract activate(): void;
}