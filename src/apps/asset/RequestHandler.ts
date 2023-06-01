import _config from "./_config.json";


import * as CoreAPI from "../../core/api/api.core";

import { IFileStamp, IHighlevelURL } from "../../interfaces";
import { THeaders, TCookies, TLocale, TUrl } from "../../types";
import { PLUGIN_NAME_REGEX } from "../../core/api/PLUGIN_NAME_REGEX";


import { join } from "path";

import "./PluginRegistry";


type TPluginEndpointHandler = (body: unknown) => unknown;


export class RequestHandler {

    private static readonly pluginReferenceRegex: RegExp = new RegExp(`\\/${_config.pluginReferenceIndicator}${PLUGIN_NAME_REGEX.source}(\\${_config.pluginReferenceConcatenator}${PLUGIN_NAME_REGEX.source})*$`);
    private static readonly webVfs: CoreAPI.VFS = new CoreAPI.VFS("./web/");
    
    private readonly reqUrl: TUrl;
    private readonly reqHeaders: THeaders;

    public message: string|Buffer;
    public status: number;
    public headers: THeaders;
    public cookies: TCookies;

    constructor(ip: string, method: string, url: TUrl, body: unknown, headers: THeaders, cookies?: TCookies, locale?: TLocale) {
        this.reqUrl = url;
        this.reqHeaders = headers;
        
        this.headers = {};
        this.cookies = {};

        switch(method.toUpperCase()) {
            case "GET":
                this.handleGET();
                break;
            case "POST":
                this.handlePOST();
                break;
            default:
                this.status = 406;
        }
    }

    private handleGET() {
        if(RequestHandler.pluginReferenceRegex.test(this.reqUrl.pathname)) {
            this.filePlugin();

            return;
        }

        const fileExtension: string = this.reqUrl.pathname.match(/(\.[^./]+)?$/)[0].toLowerCase()
        .slice(1);
        const fileName: string = this.reqUrl.pathname.match(/[^/]*$/)[0].toLowerCase()
        .replace(new RegExp(`\\.${fileExtension}$`), "");
        
        if(fileExtension === _config.defaultFileExtension
        || fileName === _config.defaultFileName) {
            this.reqUrl.pathname = this.reqUrl.pathname
            .replace(new RegExp(`\\.${_config.defaultFileExtension}$`), "")
            .replace(new RegExp(`\\/${_config.defaultFileName}$`), "/");
            
            this.redirect(this.reqUrl);

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
        ? this.fileHTMLRaw()
        : this.fileArbitrary();
    }

    private handlePOST() {
        
    }

    private redirect(redirectUrl: IHighlevelURL) {
        this.status = 301;

        this.headers["Location"] = `${redirectUrl.protocol}//${redirectUrl.host}${redirectUrl.pathname}${redirectUrl.search ? `?${redirectUrl.search}`: ""}${redirectUrl.hash ? `#${redirectUrl.hash}`: ""}`;
    }

    private filePlugin() {
        const effectivePluginNames: string[] = this.reqUrl.pathname
        .match(RequestHandler.pluginReferenceRegex)[0]
        .slice(_config.pluginReferenceIndicator.length + 1)
        .split(new RegExp(`\\${_config.pluginReferenceConcatenator}`, "g"))
        .filter((name: string) => name.trim().length);
        
        console.log(effectivePluginNames)
    }

    private fileHTMLRaw() {
        let internalPath: string = this.reqUrl.pathname;
        let fileExists: boolean = RequestHandler.webVfs.exists(internalPath);

        if(!fileExists) {
            const pathLevels: string[] = internalPath
            .replace(/(\.[^./]+)?$/, "")
            .split(/\//g)
            .filter((p: string) => p.trim());

            while(!fileExists && pathLevels.length) {
                const curFileName: string = pathLevels.pop();

                internalPath = join(pathLevels.join("/"), `${_config.compoundPageIndicator}${curFileName}`, `${curFileName}.${_config.defaultFileExtension}`);
                
                fileExists = RequestHandler.webVfs.exists(internalPath);
            }

            if(!fileExists) {
                this.fileHTMLError(404);

                return;
            }
        }

        this.fileHTML(internalPath);
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
            
            if(RequestHandler.webVfs.exists(errorFilePath)) {
                this.fileHTML(errorFilePath);

                return;
            }
        }
    }

    private fileHTML(pathname: string) {
        this.file(pathname);

        // TODO: Plugin integration
    }

    private fileArbitrary() {
        const arbitraryExists: boolean = RequestHandler.webVfs.exists(this.reqUrl.pathname);

        this.status = arbitraryExists ? 200 : 404;

        arbitraryExists
        && this.file(this.reqUrl.pathname);
    }

    private file(pathname: string) {
        const fileStamp: IFileStamp = RequestHandler.webVfs.read(pathname);

        if(this.reqHeaders["If-None-Match"] === fileStamp.ETag) {
            this.status = 304;

            return;
        }

        this.headers["ETag"] = fileStamp.ETag;

        this.message = fileStamp.data;
    }
}