/**
 * @class
 * General request/response entity class representing an interface for
 * respective manipulations. Provides general, definite methods for response
 * behavior.
 */


import {IncomingMessage, ServerResponse, STATUS_CODES as statusMessages} from "http";
import {URL} from "url";
import {join} from "path";

import webPath from "../../utilities/web-path";

import serverConfig from "../../config/config.server";

import {IReducedRequestInfo} from "../IReducedRequestInfo";


export class Entity {
    protected readonly req: IncomingMessage;
    protected readonly res: ServerResponse;
    
    protected url: URL;

    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req: IncomingMessage, res: ServerResponse) {
    	// Identically store original request/response objects
    	this.req = req;
    	this.res = res;

    	this.url = new URL(req.url);
    }

    /**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
    protected localPath(): string {
    	return join(webPath, this.url.pathname);
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
    	this.res.end(message || statusMessages[this.res.statusCode]);
    }

    /**
     * Close entity by performing a redirect to a given pathname.
     * @param {string} path - Path to redirect to
     */
    public redirect(pathname: string) {
    	this.res.setHeader("Location", pathname);

    	this.res.statusCode = 301;
        
    	this.res.end();
    }

    /**
     * Get entity related reduced request info object.
     * Enables client request individual behavior (multi interface scope).
     * @returns {IReducedRequestInfo} Reduced request info object
     */
    public getReducedRequestInfo(): IReducedRequestInfo {
    	return {
    		ip: this.getHeader("X-Forwarded-For") || this.req.connection.remoteAddress,
    		//subdomain: entity.url.subdomain,
    		pathname: this.url.pathname
    	};
    }
}