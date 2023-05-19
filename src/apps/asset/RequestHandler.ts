import _config from "./_config.json";


import { THeaders, TCookies, THighlevelCookieIn } from "../../_types";
import { IHighlevelURL, IHighlevelEncoding, IHighlevelLocale } from "../../_interfaces";

import { VFS } from "./api.core";
import { extname } from "path";


export class RequestHandler {

    public message: string;
    public status: number;
    public headers: THeaders;
    public cookies: TCookies;

    constructor(ip: string, method: string, url: IHighlevelURL, headers: THeaders, body: unknown, encoding: IHighlevelEncoding[], cookies?: THighlevelCookieIn, locale?: IHighlevelLocale[]) {
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

        this.message = VFS.read(url.pathname)?.data ?? "Not Found";
    }
}