import _config from "./_config.json";


import { THeaders, TCookies, THighlevelCookieIn } from "../../_types";
import { IHighlevelURL, IHighlevelEncoding, IHighlevelLocale } from "../../_interfaces";

import { VFS } from "./api.core";


export class RequestHandler {

    public message: string;
    public status: number;
    public headers: THeaders;
    public cookies: TCookies;

    constructor(ip: string, method: string, url: IHighlevelURL, headers: THeaders, body: unknown, encoding: IHighlevelEncoding[], cookies?: THighlevelCookieIn, locale?: IHighlevelLocale[]) {
        this.status = 200;
        this.headers = {};
        this.cookies = {};

        this.message = VFS.read(url.pathname).data;
    }
}