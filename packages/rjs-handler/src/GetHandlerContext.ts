import { ISerialRequest } from "./.shared/global.interfaces";
import { THeaders, TJSON } from "./.shared/global.types";
import { AHandlerContext } from "./AHandlerContext";
import { Config } from "./Config";
import { IFilestamp, VirtualFileSystem } from "./VirtualFileSystem";

import mime from "./mime.json";


export class GetHandlerContext extends AHandlerContext {
	private readonly vfs: VirtualFileSystem;
	private readonly customHeaders: THeaders;

	constructor(sReq: ISerialRequest, config: Config, vfs: VirtualFileSystem, customHeaders: THeaders = {}) {
		super(sReq, config);

		this.vfs = vfs;
		this.customHeaders = customHeaders;
	}

	public async process() {
		// Canonic redirect(s)
		const canonicPathnamePart: string = this.request.url.pathname
        .match(/(\/index)?(\.[hH][tT][mM][lL])?$/)[0];
		if(canonicPathnamePart.length) {
			this.response.setStatus(302);
            
			this.response.setHeader("Location", [
				this.request.url.pathname
                .replace(/\.[hH][tT][mM][lL]$/, "")
                .replace(/index$/, ""),
				this.request.url.search ?? "",
				this.request.url.hash ?? ""
			].join(""));

			this.respond();
            
			return;
		}
        
		const pathname: string = this.request.url.pathname
        .replace(/(\/)$/, "$1index")
        .replace(/(\/[^.]+)$/, "$1.html");
		const filestamp: IFilestamp = await this.vfs.read(pathname);
        
		if(!filestamp) {
			this.response.setStatus(404);   // TODO: Error pages

			this.respond();

			return;
		}
		if([ this.request.getHeader("If-None-Match") ].flat().includes(filestamp.eTag)) {
			this.response.setStatus(304);
            
			this.respond();

			return;
		}
        
		this.response.setBody(filestamp.data);

		for(const header in this.customHeaders) {
			this.response.setHeader(header, this.customHeaders[header] as string);
		}

		// MIME
		const extname: string = (pathname.match(/\.[^.]+$/) ?? [ "" ])[0];
		const fileMime: string|undefined = (
            (this.config.read("mime").object() ?? {})[extname]
            ?? (mime as TJSON)[extname]
        ) as string;
		fileMime && this.response.setHeader("Content-Type", fileMime);

		this.response.hasCompressableBody = !/^(application|image|video|audio)\//
        .test(fileMime)   // Black list pattern
        || [
        	"application/json",
        	"application/ld+json",
        	"application/rtf",
        	"image/svg",
        	"image/svg+xml",
        	"image/svg",
        ].includes(fileMime);   // White list
        
		// ETag
		this.response.setHeader("ETag", `W/${filestamp.eTag}`);

		this.respond();
	}
}