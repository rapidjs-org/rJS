/**
 * @class
 * General request/response entity class representing an interface for
 * respective manipulations. Provides general, definite methods for response
 * behavior.
 */

import config from "../../config.json";


import {existsSync} from "fs";
import {basename, dirname, join} from "path";
import {URL} from "url";
import {IncomingMessage, ServerResponse, STATUS_CODES as statusMessages} from "http";

import serverConfig from "../../config/config.server";

import tlds from "../tlds.json";


import {localeMatchRegex, defaultLang} from "../../rendering/locale/locale";


// TODO: Locale fs map

export class Entity {
    private readonly originalPathname: string;
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

    protected readonly req: IncomingMessage;
    protected readonly res: ServerResponse;
	protected isCompound = false;
	protected compoundArgs: string[];
    protected extension: string;
    protected subdomain: string[];
    protected locale: {
        language?: string;
        country?: string;
    };

    public url: URL;

    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req: IncomingMessage, res: ServerResponse) {
    	// Identically store original request/response objects
    	this.req = req;
    	this.res = res;

    	// Construct URL object for request
    	this.url = new URL(`${serverConfig.port.https ? "https": "http"}://${req.headers["host"]}${req.url}`);

    	this.originalPathname = this.url.pathname;
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

    /**
	 * Convert the current (conventional page) URL pathname to the compound equivalent
	 * Applies sideffect to URL pathname property.
	 * Compound path (internal) to use requested file name as directory prefixed with
	 * the designated indicator. Actual file to be appended then.
	 * @returns {string} Converted pathname representation
	 */
    protected pathnameToCompound(): string {
    	return join(dirname(this.url.pathname),
    		`${config.compoundPageDirPrefix}${basename(this.url.pathname).replace(/\.[a-z0-9]+$/i, "")}`,
    		basename(this.url.pathname));
    }

    /**
	 * Convert the current (compound page) URL pathname to the conventional equivalent
	 * Inverse of pathnameToCompound().
	 * @returns {string} Converted pathname representation
	 */
    protected pathnameToConventional(): string {
    	return decodeURIComponent(this.url.pathname)
    		.replace(new RegExp(`/${config.compoundPageDirPrefix}([^/]+)/\\1$`), "/$1");
    }

    /**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
    protected localPath(): string {
    	// TODO: With arg for sideeffect-less use
    	return decodeURIComponent(join(serverConfig.directory.web, this.url.pathname));
    }
    
    /**
     * Process URL retrieving the related file.
     * @returns {number} Status code
     */
    protected processPagePath(): number {   // TODO: OPTIMIZE!
    	/*
		 * Response strategy:
		 * • Use conventional page on exact request location if exists.
		 * • Use compound page (high-low nesting, bottom-up traversal, use (developing) appendix as args)
		 * • Use error (will use next error page if exists)
		 */

    	// Append pathname with default file name if none explicitly given
    	this.url.pathname = this.url.pathname.replace(/\/$/, `/${config.dynamicFileDefaultName}`);
    	
    	// TODO: Implement sideeffect-less local path construction?
    	// Respond with file located at exactly requested path if exists
    	if(existsSync(this.localPath())) {
        	return 200;
    	}
		
    	// Respond with closest related compound page if exists (bottom-up traversal)
    	// Traverse a pathname to retrieve parameters of the closest compound page in the web file system
    	const originalPathname: string = this.url.pathname;	// Backup as of processing sideeffects
		
    	// Traversal iteration limit (for preventing too deep nestings or endless traversal
    	const traversalLimit = 100;
    	// Traversal iterations counter
    	let traversalCount = 0;

    	// Intermediate compound arguments array
    	const compoundArgs: string[] = [];
    	// Traversal loop
    	do {
    		// Certain name
    		if(!/\/$/.test(this.url.pathname)) {
    			this.url.pathname = this.pathnameToCompound();
    			if(existsSync(this.localPath())) {
    				this.isCompound = true;
    				this.compoundArgs = compoundArgs.reverse();	// Reverse (stacked) array to obtain URL order
                    
    				return 200;
    			}

    			compoundArgs.push(basename(this.url.pathname));
    			this.url.pathname = dirname(this.url.pathname);
    		}

    		// Default name (indexing level)
    		this.url.pathname = join(dirname(this.url.pathname), config.dynamicFileDefaultName);
    		this.url.pathname = this.pathnameToCompound();
    		if(existsSync(this.localPath())) {
    			this.isCompound = true;
    			this.compoundArgs = compoundArgs.reverse();	// Reverse (stacked) array to obtain URL order

    			return 200;
    		}
            
    		this.url.pathname = dirname(dirname(this.url.pathname));

    		traversalCount++;

    		// Throw error upon reached iteration limit
    		if(traversalCount >= traversalLimit) {
    			// Close request due to processing timeout if traversal iteration limit reached
    			return 408;
    		}
    	} while(this.url.pathname !== "/");

    	this.url.pathname = originalPathname;	// Use original pathname (strategy adjusted)

    	// No suitable file found
    	return 404;
    }

    /**
     * Close entity by performing a response with an individual message.
     * @param {number} status Status code
     * @param {Buffer} [message] Message data
     */
    public respond(status: number, message?: Buffer) {
    	// Use generic message if none explicitly given / retrieved processing
    	message = message || Buffer.from(statusMessages[String(status)], "utf-8");

    	// Whether server uses a secure connection
    	const isSecure: boolean = serverConfig.port.https ? true : false;

    	/*
         * Set specific headers.
         */
    	this.setHeader("Server", "rapidJS");    // Keep?
    	this.setHeader("X-XSS-Protection", "1");
    	this.setHeader("X-Powered-By", null);
    	this.setHeader("Content-Length", Buffer.byteLength(message, "utf-8"));
    	isSecure        
        && this.setHeader("Strict-Transport-Security", `max-age=${serverConfig.cachingDuration.client}; includeSubDomains`);
    	// Write set cookies to respective header
    	const setCookieArray: string[] = [];
    	for(const cookie in this.cookies.set) {
    		// TODO: Keep attributes if was received
    		setCookieArray.push(`${cookie}=${this.cookies.set[cookie].value}; path=${this.originalPathname}${this.cookies.set[cookie].maxAge ? `; Max-Age=${this.cookies.set[cookie].maxAge}` : ""}${isSecure ? "; SameSite=Strict; Secure; HttpOnly" : ""}`);
    	}
    	this.res.setHeader("Set-Cookie", setCookieArray);
        
    	// Set status code
    	this.res.statusCode = isNaN(status) ? 500 : status;

    	// End request with message
    	this.res.end(message);
    }

    /**
     * Close entity by performing a redirect to a given pathname.
     * @param {string} pathnanme - Path to redirect to
     * @param {string} [hostname] - Host to redirect to
     */
    public redirect(pathname: string, hostname?: string) {
    	this.url.pathname = pathname;
    	hostname && (this.url.hostname = hostname);
        
    	this.res.setHeader("Location", this.url.toString());
        
    	this.res.statusCode = 301;
        
    	this.res.end();
    }

    public process() {
    	/*
         * Parse request cookies.
         */
    	const cookieStr = this.getHeader("Cookie");
    	cookieStr && cookieStr
    		.split(";")
    		.filter(cookie => (cookie.length > 0))
    		.forEach(cookie => {
    			const parts = cookie.split("=");
    			this.cookies.received[parts.shift().trim()] = decodeURI(parts.join("="));
    		});

    	/*
         * Retrieve subdomain(s) and store in array (partwise).
         */
    	let subdomain: string;

    	// Trim TLD suffix from hostname
    	const specialNameRegex = /([0-9]+(\.[0-9]+)*|(\.)?localhost)$/;
    	if(specialNameRegex.test(this.url.hostname)) {
    		// Local or numerical hostname
    		subdomain = this.url.hostname
    			.replace(specialNameRegex, "");
    	} else {
    		// Retrieve TLD (second level if given, first level otherwise)
    		const suffix: string[] = this.url.hostname.match(/(\.[^.]+)?(\.[^.]+)$/);
    		if(!tlds.includes(suffix[0].slice(1))
            && suffix[1]) {
    			suffix[0] = suffix[2];
    		}
    		subdomain = this.url.hostname.slice(0, -suffix[0].length);
    	}

    	// Partwise array representation
    	this.subdomain = subdomain
    		.split(/\./g)
    		.filter(part => (part.length > 0));

    	/*
         * Retrieve locale information and store in locale object.
         */
    	if(!localeMatchRegex
		|| !defaultLang) {
    		// Locale processing not enabled
    		return;
    	}

    	this.locale = {};
    	const code = this.url.pathname.match(localeMatchRegex);	// TODO: Subdomain for locale?
    	if(!code) {
    		// Invalid locale prefix provided
    		return;
    	}

    	// Remove leading locale part from internal pathname
    	// (as must not effect fs)
    	this.url.pathname = this.url.pathname.slice(code[0].length);

    	this.locale.language = code[1].match(/^[a-z]{2}/)[0];
    	this.locale.country = (code[1].match(/[A-Z]{2}$/) || [null])[0];
    }

    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IReducedRequestInfo} Common reduced request info object (to be defined in accordance with sub entity behavior)
     */
    public getReducedRequestInfo(): IReducedRequestInfo {
    	return {
			auth: this.getHeader("Authorization"),
    		ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
    		locale: this.locale,
    		pathname: decodeURIComponent(this.isCompound ? dirname(this.url.pathname) : this.url.pathname),
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
    		isCompound: this.isCompound,
    		...(this.isCompound
    			? { compound: {
    				base: this.pathnameToConventional(),
    				args: this.compoundArgs
    			} }
    			: {})
    	};
    }
}