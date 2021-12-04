/**
 * @class
 * @abstract (augmented)
 * Class representing a GET request specific entitiy.
 * To be exclusively used for inhertance in asset retrieval entities.
 * 
 * See: StaticGetEntity.js, DynamicGetEntity.js
 */


import {existsSync, readFileSync} from "fs";
import {gzipSync} from "gzip";

import serverConfig from "../../config/config.server";
import mimesConfig from "../../config/config.mimes";

import {UrlCache} from "../support/cache/UrlCache";

import {Entity} from "./Entity";


export abstract class GetEntity extends Entity {
    private static readonly cache: UrlCache<Buffer> = new UrlCache();

    protected extension: string;

    /**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
    constructor(req, res) {
    	super(req, res);
    }

    /**
     * Read the asset (file) implicitly linked to the request.
     * Use the cached value if a respecitvely valid entry exists.
     * @returns {Buffer|null} Asset (file) contents marking the foundation of the response message (idnetically if static)
     */
    protected read(): Buffer {
    	const localPath: string = this.localPath();

    	if(GetEntity.cache.exists(localPath)) {
    		return GetEntity.cache.read(localPath) as Buffer;
    	}

    	// Read file contents if file exists (use null otherwise)
    	const contents: Buffer|null = existsSync(localPath) ? readFileSync(localPath) : null;
		
    	// Write contents to cache
    	GetEntity.cache.write(this.localPath(), contents);
		
    	return contents;
    }

    /**
     * Performe a response with an individual message.
     * @param {number} status Status code
     * @param {Buffer} [message] Response message
     */
    public respond(status: number, message?: Buffer) {
    	// Set MIME type header accordingly
    	const mime: string = mimesConfig[this.extension];
    	if(mime) {
    		this.setHeader("Content-Type", message ? mime : "text/plain");
    		this.setHeader("X-Content-Type-Options", "nosniff");
    	}

    	// Apply GZIP compression and set related header if accepted by the client
    	if(message
		&& /(^|[, ])gzip($|[ ,])/.test(this.getHeader("Accept-Endcoding") || "")
        && serverConfig.gzipCompressList.includes(this.extension)) {
    		// Set header
    		this.setHeader("Content-Encoding", "gzip");
    		// Compress
    		message = gzipSync(message);
    	}

    	// Perform definite response
    	super.respond(status, message);
    }
}