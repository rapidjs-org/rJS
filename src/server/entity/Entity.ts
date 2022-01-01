/**
 * @class
 * General request/response entity class representing an interface for
 * respective manipulations. Provides general, definite methods for response
 * behavior.
 */


import {IncomingMessage, ServerResponse, STATUS_CODES as statusMessages} from "http";
import {URL} from "url";
import {join} from "path";

import serverConfig from "../../config/config.server";

import tlds from "../support/static/tlds.json";
import languageCodes from "../support/static/languages.json";
import countryCodes from "../support/static/countries.json";


export class Entity {
    protected readonly req: IncomingMessage;
    protected readonly res: ServerResponse;
    protected readonly subdomain: string[];
    
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
        
    	this.url = new URL(`${serverConfig.port.https ? "https": "http"}://${req.headers.host}${req.url}`);

        // Retrieve subdomain(s) and store in array (partwise)
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

        // Retrieve locale information
        // TODO: Implement
    }

    /**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
    protected localPath(): string {
    	return decodeURIComponent(join(serverConfig.webDirectory, this.url.pathname));
    }

    /**
     * Retrieve header information from entity (request).
     * @param {string} key Header key
     * @returns {string} value Header value
     */
    protected getHeader(key: string): string {
    	return String(this.req.headers[key] || this.req.headers[key.toLowerCase()]);
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

    	// Set headers
    	this.setHeader("Server", "rapidJS");    // Keep?
    	this.setHeader("X-XSS-Protection", "1");
    	this.setHeader("X-Powered-By", null);
    	this.setHeader("Content-Length", Buffer.byteLength(message, "utf-8"));
    	serverConfig.port.https
        && this.setHeader("Strict-Transport-Security", `max-age=${serverConfig.cachingDuration.client}; includeSubDomains`);
        
    	// Set status code
    	this.res.statusCode = isNaN(status) ? 500 : status;
        
    	// End request with message
    	this.res.end(message);
    }

    /**
     * Close entity by performing a redirect to a given pathname.
     * @param {string} pathn<mw - Path to redirect to
     * @param {string} [hostname] - Host to redirect to
     */
    public redirect(pathname: string, hostname?: string) {
        this.url.pathname = pathname;
        hostname && (this.url.hostname = hostname);
        
    	this.res.setHeader("Location", this.url.toString());
        
    	this.res.statusCode = 301;
        
    	this.res.end();
    }


    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IReducedRequestInfo} Common reduced request info object (to be defined in accordance with sub entity behavior)
     */
	public getReducedRequestInfo(): IReducedRequestInfo {
		return {
    		ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
    		subdomain: this.subdomain,
        }
    }
}