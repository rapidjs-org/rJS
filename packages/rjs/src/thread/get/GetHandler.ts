import { TJSON } from "../../types";
import { IFilestamp } from "../../interfaces";
import { AHandler } from "../AHandler";
import { Config } from "../../Config";

import { VirtualFileSystem } from "./VirtualFileSystem";

import mime from "./mime.json";

import _config from "../../_config.json";


const CUSTOM_HEADERS: TJSON = Config.global.read("headers").obj() ?? {};


export class GetHandler extends AHandler {
    private readonly filesVFS: VirtualFileSystem = new VirtualFileSystem(
        Config.global.read("filesDirName").string()
        ?? _config.defaultFilesDirName
    );
    
    public process(): void {
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
        
        if(!this.filesVFS.exists(pathname)) {
            this.response.setStatus(404);   // TODO: Error pages

            this.respond();

            return;
        }

        const filestamp: IFilestamp = this.filesVFS.read(pathname);

        if([ this.request.getHeader("If-None-Match") ].flat().includes(filestamp.eTag)) {
            this.response.setStatus(304);
            
            this.respond();

            return;
        }
        
        this.response.setBody(filestamp.data);

        for(const header in CUSTOM_HEADERS) {
            this.response.setHeader(header, CUSTOM_HEADERS[header] as string);
        }

        // MIME
        const extname: string = (pathname.match(/\.[^.]+$/) ?? [ "" ])[0];
        const fileMime: string|undefined = ((Config.global.read("mime").obj() ?? {})[extname]
                                        ?? (mime as TJSON)[extname]) as string;
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