/**
 * @class
 * General request/response entity class representing an interface for
 * respective manipulations. Provides general, definite methods for response
 * behavior.
 */

import config from "../../config.json";


import { existsSync } from "fs";
import { basename, dirname, join } from "path";
import { URL } from "url";
import { IncomingMessage, ServerResponse, STATUS_CODES as statusMessages } from "http";


import serverConfig from "../../config/config.server";

import tlds from "../tlds.json";

import { localeMatchRegex, defaultLang } from "../../rendering/locale/locale";

import { createHook } from "../hook";
import { rateExceeded } from "../rate-limiter";


// TODO: Locale fs map

export class Entity {
    private readonly req: IncomingMessage;
    private readonly res: ServerResponse;
    private readonly headOnly: boolean;
    private readonly cookies: {
        received: Record<string, string|number|boolean>;
        set: Record<string, {
            value: string|number|boolean;
            maxAge?: number
        }>;
    } = {
    	received: {},
    	set: {}
    };

    protected readonly subdomain: string[] = [];
    protected readonly locale: {
        language?: string;
        country?: string;
    };

	private requestObj: IRequestObject;	// Create once at most

    protected compoundArgs: string[];
	protected hostname: string;
    protected requestPath: string;
    protected webPath: string;


    constructor(req, res, headOnly: boolean = false) {
    	// Identically store original request/response objects
    	this.req = req;
    	this.res = res;

		this.headOnly = headOnly;

		this.hostname = `http${serverConfig.port.https ? "s" : ""}://${this.getHeader("Host")}/`
    	this.requestPath = this.req.url.replace(/[#?].*$/, "");

		// Block request if individual request maximum reached (rate limiting)
		if(rateExceeded(this.req.connection.remoteAddress)) {
			this.setHeader("Retry-After", 30000); // Retry after half the rate limiting period length
			
			this.respond(429);

			return;
		}

		// Block request if URL is exceeding the maximum length
		if(serverConfig.limit.urlLength > 0
		&& this.req.url.length > serverConfig.limit.urlLength) {
			this.respond(414);
			
			return;
		}

		// Hook entity on async thread
		createHook(this);


		// Initialize empty locale object if locale processing is enabled
    	if(localeMatchRegex && defaultLang) {
			this.locale = {
				language: null,
				country: null
			};
		}

		this.process();
    }

	protected process() {}

    protected requestEvent(name, callback) {
		this.req.on(name, callback);
	}

    protected localPath(path) {
        return join(serverConfig.directory.web, path)
		.replace(/(?<!\.[a-z]+)$/i, `.${config.dynamicFileExtension}`);
    }

    protected fileExists(path) {
        return path && existsSync(this.localPath(path));
    }

    /**
     * Get header information from entity (request).
     * @param {string} key Header key
     * @returns {string} value Header value
     */
    protected getHeader(key: string): string {
    	const header = this.req.headers[key] || this.req.headers[key.toLowerCase()];
    	return header
    		? String(header)
    		: undefined;
    }

    /**
     * Set header information for entity (response).
     * @param {string} key Header key
     * @param {string|number} value Header value
     */
    protected setHeader(key: string, value: string|number) {
    	this.res.setHeader(key, value);
    }

	protected toConventionalPath(path) {
		return dirname(path)
		.replace(new RegExp(`/${config.compoundPageDirPrefix}`), "");
	}

	protected toCompoundPath(path) {
		return join(dirname(path),
		`${config.compoundPageDirPrefix}${basename(path)}`,
		basename(path));
	};

    protected retrieveDynamicPath() {
        /*
		 * Response strategy:
		 * • Use conventional page on exact request location if exists.
		 * • Use compound page (high-low nesting, bottom-up traversal, use (developing) appendix as args)
		 * • Use error (will use next error page if exists)
		 */

    	// Append pathname with default names if none explicitly given
    	let path = this.requestPath
        .replace(/\/$/, `/${config.dynamicFileDefaultName}`);
    	
    	if(this.fileExists(path)) {
        	return path;
    	}
		
    	// Respond with closest related compound page if exists (bottom-up traversal)
    	// Traverse a pathname to retrieve parameters of the closest compound page in the web file system

        // Traversal iteration limit (for preventing too deep nestings or endless traversal
		this.compoundArgs = [];
    	let traversalLimit = 100;
    	// Traversal loop
        path = this.requestPath;
    	do {
    		// Search for index named
    		let compoundPath = this.toCompoundPath(join(path, config.dynamicFileDefaultName));
    		if(this.fileExists(compoundPath)) {
    			return compoundPath;
    		}

    		// Certain name
            compoundPath = this.toCompoundPath(path);
    		if(this.fileExists(compoundPath)) {
                return compoundPath;
    		}

    		this.compoundArgs.unshift(basename(path));
    		path = dirname(path);

    		if(--traversalLimit == 0) {
    			break;
    		}
    	} while(path !== "/");

		return undefined;
    }

	/*
	 * Parse request cookies to cookies object (get).
	 */
	protected parseCookies() {
    	const cookieStr = this.getHeader("Cookie");

		if(!cookieStr) {
			return;
		}

    	cookieStr.split(";")
		.filter(cookie => (cookie.length > 0))
		.forEach(cookie => {
			const parts = cookie.split("=");
			this.cookies.received[parts.shift().trim()] = decodeURI(parts.join("="));
		});
	}

	/*
	 * Parse subdomain(s) to array (partwise).
	 */
	protected parseSubdomain() {
    	let subdomain: string;
		const host = this.getHeader("Host") || "";

    	// Trim TLD suffix from host
    	const specialNameRegex = /([0-9]+(\.[0-9]+)*|(\.)?localhost)(:[0-9]+)?$/;
    	if(specialNameRegex.test(host)) {
    		// Local or numerical host
    		this.subdomain.push(host
    			.replace(specialNameRegex, ""));

			return;
    	}

		// Retrieve TLD (second level if given, first level otherwise)
		const suffix: string[] = host.match(/(\.[^.]+)?(\.[^.]+)$/);
		if(!tlds.includes(suffix[0].slice(1))
		&& suffix[1]) {
			suffix[0] = suffix[2];
		}
		subdomain = host.slice(0, -suffix[0].length);

    	// Partwise array representation
    	subdomain
		.split(/\./g)
		.filter(part => (part.length > 0))
		.forEach(part => {
			this.subdomain.push(part);
		});
	}

	/*
	 * Parse locale information to locale object.
	 */
	protected parseLocale() {
    	if(!this.locale) {
    		// Locale processing not enabled
    		return;
    	}

    	const code = this.requestPath.match(localeMatchRegex);	// TODO: Subdomain for locale?
    	if(!code) {
    		// Invalid locale prefix provided
    		return;
    	}

    	// Remove leading locale part from internal pathname
    	// (as must not effect fs)

    	this.locale.language = code[1].match(/^[a-z]{2}/)[0];
    	this.locale.country = (code[1].match(/[A-Z]{2}$/) || [null])[0];
		
		// Adapt local path
    	this.requestPath = this.requestPath.slice(code[0].length);
	}


    public respond(status: number, message?: Buffer) {
    	// Use generic message if none explicitly given / retrieved processing
    	message = message || Buffer.from(statusMessages[String(status)], "utf-8");

    	// Whether server uses a secure connection
    	const isSecure: boolean = serverConfig.port.https ? true : false;

    	this.setHeader("X-XSS-Protection", "1; mode=block");
    	this.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    	this.setHeader("Content-Length", Buffer.byteLength(message, "utf-8"));
    	isSecure
        && this.setHeader("Strict-Transport-Security", `max-age=${serverConfig.cachingDuration.client}; includeSubDomains`);
    	this.setHeader("Server", "rapidJS");

		// Write set cookies to respective header
    	const setCookieArray: string[] = [];
    	for(const cookie in this.cookies.set) {
    		// TODO: Keep attributes if was received
    		setCookieArray.push(`${cookie}=${this.cookies.set[cookie].value}; path=${this.requestPath}${this.cookies.set[cookie].maxAge ? `; Max-Age=${this.cookies.set[cookie].maxAge}` : ""}${isSecure ? "; SameSite=Strict; Secure; HttpOnly" : ""}`);
    	}
    	this.res.setHeader("Set-Cookie", setCookieArray);
        
		// Conceal status for client and server errors if enabled (virtual 404)
		status = (serverConfig.concealing404 === true) && ["4", "5"].includes(String(status).charAt(0))
		? 404
		: status;
		
    	// Set status code
    	this.res.statusCode = status;

    	// End request with message
    	this.res.end(this.headOnly ? null : message);
    }

    /**
     * Close entity by performing a redirect to a given pathname.
     * @param {string} pathname - Path to redirect to
     * @param {string} [hostname] - Host to redirect to
     */
    public redirect(pathname: string, hostname?: string) {
    	const redirectUrl = new URL(`${hostname || this.hostname}${this.req.url}`);
    	redirectUrl.pathname = pathname;
        
    	this.setHeader("Location", redirectUrl.toString());
        
    	this.respond(301);
    }

    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IRequestObject} Common reduced request info object (to be defined in accordance with sub entity behavior)
     */
    public getRequestObject(): IRequestObject {
		if(this.requestObj) {
			return this.requestObj;
		}

		const isCompound = Array.isArray(this.compoundArgs);

    	this.requestObj = {
    		auth: this.getHeader("Authorization"),	// TODO: Enhance
    		ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
    		locale: this.locale,
    		pathname: isCompound ? dirname(this.webPath) : (this.webPath || this.requestPath),
    		subdomain: this.subdomain,
            
    		// Cookies manipulation interface
    		cookies: {
    			/**
                 * Get a request cookie by name.
                 * @param {string} name Cookie name
                 * @returns {string|number|boolean} Cookie value (if defined)
                 */
    			get: (name: string): string|number|boolean => {
    				return this.cookies.set[name]
    					? this.cookies.set[name].value
    					: this.cookies.received[name];
    			},
    			/**
                 * Set a response cookie.
                 * @param {string} name Cookie name
                 * @param {string|number|boolean} Cookie value to set
                 * @param {number} [maxAge] Cookie life time in seconds (considered a session cookie if is undefined)
                 */
    			set: (name: string, value: string|number|boolean, maxAge?: number) => {
    				this.cookies.set[name] = {
    					value: value,
    					maxAge: maxAge
    				};
    			}
    		},

    		// Compound page specific information
    		isCompound: isCompound,
    		...(isCompound
    			? { compound: {
    				base: this.toConventionalPath(this.webPath),
    				args: this.compoundArgs
    			} }
    			: {})
    	};

		return this.requestObj;
    }
}