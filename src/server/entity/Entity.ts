/**
 * @class
 * General request/response entity class representing an interface for
 * respective manipulations. Provides general, definite methods for response
 * behavior.
 */


import {IncomingMessage, ServerResponse, STATUS_CODES as statusMessages} from "http";
import {URL} from "url";

import serverConfig from "../../config/config.server";

import tlds from "../support/static/tlds.json";
import languageCodes from "../support/static/languages.json";
import countryCodes from "../support/static/countries.json";


// TODO: Locale fs map

export class Entity {
    private readonly timestamp: number; // For duration calculation
    private readonly originalPathname: string;
    private cookies: {
        received: Record<string, string|number|boolean>;
        set: Record<string, {
            value: string|number|boolean;
            maxAge?: number
        }>;
    };

    protected readonly req: IncomingMessage;
    protected readonly res: ServerResponse;
    protected subdomain: string[];
    protected locale: {
        lang?: string;
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
    	this.url = new URL(`${serverConfig.port.https ? "https": "http"}://${this.getHeader("host")}${req.url}`);

        this.originalPathname = this.url.pathname;
    }

    /**
     * Get header information from entity (request).
     * @param {string} key Header key
     * @returns {string} value Header value
     */
    protected getHeader(key: string): string {
        const header = this.req.headers[key] || this.req.headers[key.toLowerCase()]
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
            setCookieArray.push(`${cookie}=${this.cookies.set[cookie].value}; path=${this.originalPathname}${this.cookies.set[cookie].maxAge ? `; Max-Age=${this.cookies.set[cookie].maxAge}` : ""}${isSecure ? `; SameSite=Strict; Secure; HttpOnly` : ""}`);
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
        this.cookies = {
            received: {},
            set: {}
        };

        const cookieStr =  this.getHeader("Cookie");
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
        const specialNameRegex: RegExp = /([0-9]+(\.[0-9]+)*|(\.)?localhost)$/;
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
        if(!serverConfig.locale.defaultLang
        && !serverConfig.locale.defaultCountry) {
            return;
        }
                
        this.locale = {};
        
        const code = this.url.pathname.match(/^\/([a-z]{2})?(-)?([A-Z]{2})?\//);
        if(!code) {
            return;
        }

        if((code[1] && !languageCodes.includes(code[1]))    // Language code
        || (code[3] && !countryCodes.includes(code[3]))     // Country code
        || (code[2] && (!code[1] || !code[3]))) {           // Has dash, requires both codes
            // Invalid locale prefix
            return;
        }

        // Remove leading locale part from internal pathname
        // (as must not effect fs)
        this.url.pathname = this.url.pathname.slice(code[0].length);
        
        this.locale.lang = code[1];
        this.locale.country = code[3];
    }

    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IReducedRequestInfo} Common reduced request info object (to be defined in accordance with sub entity behavior)
     */
	public getReducedRequestInfo(): IReducedRequestInfo {
        // TODO: Relevant headers (auth)?
		return {
    		ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
    		subdomain: this.subdomain,
            locale: this.locale,

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
            }
        }
    }
}