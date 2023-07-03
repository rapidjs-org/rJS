import _config from "./_config.json";


import * as CoreAPI from "../../core/api/api.core";

import { IFileStamp, IHighlevelURL } from "../../interfaces";
import { THeaders, TCookies, TLocale, TUrl } from "../../types";
import { PLUGIN_NAME_REGEX } from "../../core/api/PLUGIN_NAME_REGEX";


import { join } from "path";

import { PluginRegistry } from "./PluginRegistry";


interface IEndpointReqObj {
	auth: string|string[];
	ip: string;
	cookies: unknown;
	locale: TLocale;

	compoundVFS?: CoreAPI.VFS;
}


export class RequestHandler {

	private static readonly supportedLocale = CoreAPI.config.get("locale").object() as Record<string, string[]>;
    private static readonly pluginReferenceRegex: RegExp = new RegExp(`^\\/${_config.pluginReferenceIndicator}${PLUGIN_NAME_REGEX.source}(\\${_config.pluginReferenceConcatenator}${PLUGIN_NAME_REGEX.source})*$`);
    private static readonly webVfs: CoreAPI.VFS = new CoreAPI.VFS("./web/");
	private static readonly endpointSignatureReqIndexes: Map<string[], number> = new Map();
    
	private readonly reqIp: string;
    private readonly reqUrl: TUrl;
    private readonly reqBody: unknown;
    private readonly reqHeaders: THeaders;
    private readonly reqCookies: TCookies;
	private readonly reqLocale: TLocale;
	private readonly reqLocaleUrl: [ string, string ];

	private endpointRequestObj: IEndpointReqObj;

    public message: string|Buffer;
    public status: number;
    public headers: THeaders;
    public cookies: TCookies;

    constructor(ip: string, method: string, url: TUrl, body: unknown, headers: THeaders, cookies?: TCookies, locale?: TLocale, asyncResolveCallback: ((reqHandler?: RequestHandler) => void) = (() => {})) {
    	this.reqIp = ip;
    	this.reqUrl = url;
    	this.reqBody = body;
    	this.reqHeaders = headers;
    	this.reqCookies = cookies;
    	this.reqLocale = locale;
		
    	this.headers = {};
    	this.cookies = {};
		
		if(RequestHandler.supportedLocale) {
			const potentialLocalePrefix: RegExpMatchArray = this.reqUrl.pathname.match(/^\/[a-z]{2}(-[A-Z]{2})?\//);

			if(potentialLocalePrefix) {
				const localeParts: string[] = potentialLocalePrefix[0].slice(1, -1).split("-");
				console.log(RequestHandler.supportedLocale)
				if(localeParts[1]
				? (RequestHandler.supportedLocale[localeParts[0]] ?? []).includes(localeParts[1])
				: RequestHandler.supportedLocale[localeParts[0]]) {
					this.reqLocaleUrl = [ localeParts[0], localeParts[1] ];
					this.reqUrl.pathname = this.reqUrl.pathname.slice(potentialLocalePrefix[0].length - 1);
				}
			}
		}
		
    	switch(method) {
    	case "GET":
    		this.handleGET();
    		break;
    	case "POST":
    		this.handlePOST(asyncResolveCallback);
    		return;
    	default:
    		this.status = 406;
    	}
		
		asyncResolveCallback(this);
    }

	private produceEndpointRequestObj(): IEndpointReqObj {
		this.endpointRequestObj = {
			auth: this.reqHeaders["Authorization"],
			ip: this.reqIp,
			locale: this.reqLocale,
			cookies: {
				get: (name: string) => this.reqCookies[name],
				set: (name: string, value: string|number|boolean, options: {
					maxAge?: number;
					domain?: string;
					path?: string;
					httpOnly?: boolean;
					sameSite?: string;
				}) => (this.reqCookies[name] = {
					value,
					...options
				}),
			},
		};

		return this.endpointRequestObj;
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
        && (this.headers["Content-Type"] = mime);

    	(!fileExtension)
    		? this.fileHTMLRaw()
    		: this.fileArbitrary();
    }

    private async handlePOST(asyncResolveCallback: ((reqHandler: RequestHandler) => void)) {
		const pluginName: string = this.reqUrl.pathname.match(PLUGIN_NAME_REGEX)[0];
		const endpointName: string = this.reqUrl.pathname.slice(pluginName.length + 2);

		const serverModuleReference = PluginRegistry.getServerModuleReference(pluginName);
		
		if(!serverModuleReference || !serverModuleReference[endpointName]) {
			this.status = 404;

			asyncResolveCallback(this);

			return;
		}

		let endpointMember: unknown = serverModuleReference[endpointName];

		let argValueList = this.reqBody as unknown[];
		let reqIndex: number;
		if(!RequestHandler.endpointSignatureReqIndexes.has([ pluginName, endpointName ])) {
			const argNameList: string[] = (endpointMember as Function).toString()
			.replace(/\\["'`]/g, "")
			.replace(/(["'`])((?!\1)(\s|.))*\1/g, "")
			.match(/\(((?!\))(\s|.))*\)/)[0]
			.slice(1, -1).split(/,/g)
			.map((arg: string) => arg.trim().split(" ")[0]);

			reqIndex = argNameList.indexOf(_config.endpointRequestObjectArgumentIdentifier);

			RequestHandler.endpointSignatureReqIndexes.set([ pluginName, endpointName ], reqIndex);
		} else {
			reqIndex = RequestHandler.endpointSignatureReqIndexes.get([ pluginName, endpointName ]);
		}

		argValueList = (reqIndex >= 0)
		? argValueList
			.slice(0, reqIndex)
			.concat([ this.produceEndpointRequestObj() ], argValueList.slice(reqIndex))
		: argValueList;

		try {
			endpointMember = (endpointMember instanceof Function)
			? endpointMember.apply(null, argValueList)
			: endpointMember;

			this.message = (endpointMember instanceof Promise)
			? await endpointMember
			: endpointMember;
		} catch(errOrStatusCode: unknown) {
			const isStatusCode: boolean = (errOrStatusCode instanceof Number) || typeof(errOrStatusCode) == "number";

			this.status = isStatusCode
			? errOrStatusCode as number
			: 500;
			
			this.message = !isStatusCode
			? errOrStatusCode.toString()
			: null;
		}
		console.log(this.endpointRequestObj)
		asyncResolveCallback(this);
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
        
    	let concatenatedModules: string[] = [];
    	effectivePluginNames
    	.forEach((pluginName: string) => {
    		concatenatedModules.push(PluginRegistry.getClientModuleText(pluginName));
    	});

    	const requestedUndefined: boolean = concatenatedModules.includes(null);
    	concatenatedModules = concatenatedModules
    	.filter(moduleText => moduleText);
        
    	if(!concatenatedModules.length) {
    		this.status = 404;

    		return;
    	}

    	this.headers["Content-Type"] = "text/javascript";

    	this.status = requestedUndefined ? 207 : 200;

    	this.message = PluginRegistry.produceModuleText("client.wrapper", {
    		"PLUGINS": concatenatedModules.join("\n")
    	});
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

    	const pluginReferenceTag = `<script src="/${_config.pluginReferenceIndicator}${PluginRegistry.getGloballyEffective().join(_config.pluginReferenceConcatenator)}"></script>`;   // TODO: Dir local plugins?

    	this.message = /<\s*head(\s|>).*>.*<\s\/head\s*>/i.test(this.message as string)
    		? (this.message as string).replace(/(<\s*head(\s|>)[^>]*>)/, `$1${pluginReferenceTag}`) // TODO: Strengthen regexes
    		: (this.message as string).replace(/((<\s*html(\s|>)[^>]*>)|^)/, `$1${pluginReferenceTag}`);
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