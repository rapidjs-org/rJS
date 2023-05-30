import _config from "./_config.json";


import * as CoreAPI from "../../core/api/api.core";

import { IFileStamp, IHighlevelURL } from "../../interfaces";
import { THeaders, TCookies, TEncoding, TLocale, TURL } from "../../types";


import { join } from "path";

import { WEB_VFS } from "./WEB_VFS";


import defaultConfig from "./default.config.json";



CoreAPI.config.mergeDefault(defaultConfig);


export class RequestHandler {

    private readonly reqUrl: TURL;
    private readonly reqHeaders: THeaders;

    public message: string|Buffer;
    public status: number;
    public headers: THeaders;
    public cookies: TCookies;

    constructor(ip: string, method: string, url: TURL, body: unknown, headers: THeaders, encoding: TEncoding, cookies?: TCookies, locale?: TLocale) {
        this.reqUrl = url;
        this.reqHeaders = headers;
        
        this.headers = {};
        this.cookies = {};

        const fileExtension: string = this.reqUrl.pathname.match(/(\.[^./]+)?$/)[0].toLowerCase()
        .slice(1);
        const fileName: string = this.reqUrl.pathname.match(/[^/]*$/)[0].toLowerCase()
        .replace(new RegExp(`\\.${_config.defaultFileExtension}$`), "");
        
        if(fileExtension === _config.defaultFileExtension
        || fileName === _config.defaultFileName) {
            this.reqUrl.pathname = this.reqUrl.pathname
            .replace(new RegExp(`\\.${_config.defaultFileExtension}$`), "")
            .replace(new RegExp(`/${_config.defaultFileName}$`), "/");

            this.redirect(reqUrl);

            return;
        }

        if(fileName.charAt(0) === _config.privateFileIndicator) {
            !fileExtension
            ? this.fileHTMLError(403)
            : (this.status = 403);

            return;
        }

        this.reqUrl.pathname += !fileName ? _config.defaultFileName : "";
        this.reqUrl.pathname += !fileExtension ? `.${_config.defaultFileExtension}` : "";
        
        const mime: string = CoreAPI.config.get("mimes", fileExtension).string();
        mime
        && (this.headers["Content-Encoding"] = mime);

        (!fileExtension)
        ? this.fileHTML()
        : this.fileArbitrary();
    }

    private redirect(redirectUrl: IHighlevelURL) {
        this.status = 301;

        this.headers["Location"] = `${redirectUrl.protocol}//${redirectUrl.host}${redirectUrl.pathname}${redirectUrl.search ? `?${redirectUrl.search}`: ""}${redirectUrl.hash ? `#${redirectUrl.hash}`: ""}`;
    }

    private fileHTML() {
        let internalPath: string = this.reqUrl.pathname;
        let fileExists: boolean = WEB_VFS.exists(internalPath);

        if(!fileExists) {
            const pathLevels: string[] = internalPath
            .replace(/(\.[^./]+)?$/, "")
            .split(/\//g)
            .filter((p: string) => p.trim());

            while(!fileExists && pathLevels.length) {
                const curFileName: string = pathLevels.pop();

                internalPath = join(pathLevels.join("/"), `${_config.compoundPageIndicator}${curFileName}`, `${curFileName}.${_config.defaultFileExtension}`);
                
                fileExists = WEB_VFS.exists(internalPath);
            }

            if(!fileExists) {
                this.fileHTMLError(404);

                return;
            }
        }

        this.file(internalPath);
    }

    private fileHTMLError(status: number) {
        this.status = status;

        const pathLevels: string[] = this.reqUrl.pathname
        .replace(/(\.[^./]+)?$/, "")
        .split(/\//g)
        .filter((p: string) => p.trim());

        while(pathLevels.length) {
            pathLevels.pop();

            const errorFilePath: string = join(pathLevels.join("/"), `${_config.privateFileIndicator}${status}.${_config.defaultFileExtension}`);
            
            if(WEB_VFS.exists(errorFilePath)) {
                this.file(errorFilePath);

                return;
            }
        }
    }

    private fileArbitrary() {
        const arbitraryExists: boolean = WEB_VFS.exists(this.reqUrl.pathname);

        this.status = arbitraryExists ? 200 : 404;

        arbitraryExists
        && this.file(this.reqUrl.pathname);
    }

    private file(pathname: string) {
        const fileStamp: IFileStamp = WEB_VFS.read(pathname);

        if(this.reqHeaders["If-None-Match"] === fileStamp.ETag) {
            this.status = 304;

            return;
        }

        this.headers["ETag"] = fileStamp.ETag;

        this.message = fileStamp.data;
    }
}