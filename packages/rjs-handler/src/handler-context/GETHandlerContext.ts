import { readFileSync } from "fs";
import { join } from "path";

import { ISerialRequest } from "../.shared/global.interfaces";
import { THeaders, TJSON } from "../.shared/global.types";
import { AHandlerContext } from "./AHandlerContext";
import { TypeResolver } from "../TypeResolver";
import { IFilestamp, VirtualFileSystem } from "../VirtualFileSystem";

import mime from "../mime.json";

const CLIENT_SCRIPT: string = readFileSync(
    join(__dirname, "../../client/rjs.client.js")
)
    .toString()
    .replace(/\n/g, "")
    .replace(/\s{2,}/g, " ");

export class GETHandlerContext extends AHandlerContext {
    private readonly vfs: VirtualFileSystem;
    private readonly customHeaders: THeaders;

    constructor(
        sReq: ISerialRequest,
        config: TypeResolver,
        vfs: VirtualFileSystem,
        customHeaders: THeaders = {},
        dev: boolean
    ) {
        super(sReq, config, dev);

        this.vfs = vfs;
        this.customHeaders = customHeaders;
    }

    private injectClientScript(htmlMarkup: string): string {
        const firstTagIndex = (tagName: string) => {
            const match: string[] =
                htmlMarkup.match(
                    new RegExp(
                        `<${tagName}(?:\\s+[^="']+(?:=(?:"[^"]*"|'[^']*'))?)*\\s*>`,
                        "i"
                    )
                ) ?? [];

            const index: number = match[0]
                ? htmlMarkup.indexOf(match[0])
                : Infinity;

            return index + (match[0] ?? "").length;
        };

        const insertionIndex: number = Math.max(
            firstTagIndex("HTML"),
            firstTagIndex("HEAD")
        );
        return insertionIndex < Infinity
            ? [
                  htmlMarkup.slice(0, insertionIndex),
                  `${`<script>${CLIENT_SCRIPT}</script>`}`,
                  htmlMarkup.slice(insertionIndex)
              ].join("\n")
            : htmlMarkup;
    }

    public async process() {
        // Canonic redirect(s)
        let redirect: boolean = false;
        const redirectUrl: URL = this.request.url;
        const wwwSubdomainStrategy: string = this.config.read("www").string();
        if (["always", "never"].includes(wwwSubdomainStrategy)) {
            const previousHostname: string = redirectUrl.hostname.toString();
            redirectUrl.hostname = redirectUrl.hostname.replace(
                /^(www\.)?/,
                wwwSubdomainStrategy === "always" ? "www." : ""
            );

            redirect = redirectUrl.hostname.toString() !== previousHostname;
        }
        const canonicPathnamePart: string = this.request.url.pathname.match(
            /(\/index)?(\.[hH][tT][mM][lL])?$/
        )[0];
        if (canonicPathnamePart.length) {
            redirectUrl.pathname = redirectUrl.pathname
                .replace(/\.[hH][tT][mM][lL]$/, "")
                .replace(/index$/, "");

            redirect = true;
        }
        if (redirect) {
            this.response.setStatus(301);

            this.response.setHeader("Location", redirectUrl.toString());

            this.respond();

            return;
        }

        for (const header in this.customHeaders) {
            this.response.setHeader(
                header,
                this.customHeaders[header] as string
            );
        }

        const pathname: string = this.request.url.pathname
            .replace(/(\/)$/, "$1index")
            .replace(/(\/[^.]+)$/, "$1.html");
        const extname: string =
            (pathname.match(/\.([^.]+)$/) ?? [""])[1].toLowerCase() ?? "html";

        let filestamp: IFilestamp = await this.vfs.read(pathname);
        if (!filestamp) {
            this.response.setStatus(404);

            if (extname === "html") {
                const pathLevels: string[] = pathname.split(/\//g).slice(0, -1);
                while (!filestamp && pathLevels.length) {
                    filestamp = await this.vfs.read(
                        [...pathLevels, "404.html"].join("/")
                    );
                    pathLevels.pop();
                }
            }
        }

        if (!filestamp) {
            this.respond();

            return;
        }

        if (
            [this.request.getHeader("If-None-Match")]
                .flat()
                .includes(filestamp.eTag)
        ) {
            this.response.setStatus(304);

            this.respond();

            return;
        }

        // MIME
        const fileMime: string | undefined = ((this.config
            .read("mime")
            .object() ?? {})[extname] ?? (mime as TJSON)[extname]) as string;
        fileMime && this.response.setHeader("Content-Type", fileMime);
        this.response.setBody(
            fileMime === "text/html"
                ? this.injectClientScript(filestamp.data.toString())
                : filestamp.data
        );

        this.response.hasCompressableBody =
            !/^(application|image|video|audio)\//.test(fileMime) || // Black list pattern
            [
                "application/json",
                "application/ld+json",
                "application/rtf",
                "image/svg",
                "image/svg+xml",
                "image/svg"
            ].includes(fileMime); // White list

        // ETag
        this.response.setHeader("ETag", `W/${filestamp.eTag}`);

        this.respond();
    }
}
