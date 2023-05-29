import _config from "./_config.json";


import { extname } from "path";

import { IHighlevelURL } from "../../interfaces";
import { THeaders, TCookies, TEncoding, TLocale } from "../../types";

import { WEB_VFS } from "./WEB_VFS";


export class RequestHandler {

    public message: string;
    public status: number;
    public headers: THeaders;
    public cookies: TCookies;

    constructor(ip: string, method: string, url: IHighlevelURL, body: unknown, headers: THeaders, encoding: TEncoding, cookies?: TCookies, locale?: TLocale) {
        this.headers = {};
        this.cookies = {};

        const fileExtension: string = extname(url.pathname).slice(1);

        if(fileExtension === _config.defaultFileExtension) {
            url.pathname = url.pathname.slice(0, -(fileExtension.length + 1));

            this.redirect(url);

            return;
        }

        if(!fileExtension.length) {
            url.pathname += `.${_config.defaultFileExtension}`;
        }

        this.file(url);
    }

    private redirect(url: IHighlevelURL) {
        this.status = 301;

        this.headers["Location"] = `${url.protocol}//${url.host}${url.pathname}${url.search ? `?${url.search}`: ""}${url.hash ? `#${url.hash}`: ""}`;
    }

    private file(url: IHighlevelURL) {
        this.headers["Content-Encoding"] = "text/html";
        this.status = 200;
        
        this.message = WEB_VFS.read(url.pathname)?.data ?? "Not Found";
    }
}