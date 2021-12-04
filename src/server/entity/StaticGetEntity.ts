/**
 * @class
 * Class representing a GET request specific entitiy.
 * To be served without being affected by custom 
 */


import serverConfig from "../../config/config.server";


import {existsSync, openSync, fstatSync} from "fs";
import {extname} from "path";
import {createHash} from "crypto";

import {isClientModuleRequest, retrieveClientModules} from "../../interface/plugin/registry";

import {normalizeExtension} from "../../utilities/normalize";

import {GetEntity} from "./GetEntity";


const hash = createHash("md5");


export class StaticGetEntity extends GetEntity {
	/**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
	constructor(req, res) {
		super(req, res);

    	this.extension = normalizeExtension(extname(this.url.pathname));
	}
	
	/**
     * Close entity by performing a response with an individual message.
     * @param {number} status Status code
     */
	public respond(status: number) {
		// Set cache control headers
	    serverConfig.cachingDuration.client
        && this.setHeader("Cache-Control", `public, max-age=${serverConfig.cachingDuration.client}, must-revalidate`);
        
		// Perform definite response
		super.respond(status, super.read());
	}

	public process() {
		if(isClientModuleRequest(this.url.pathname)) {
			return super.respond(200, retrieveClientModules(this.url.pathname));
		}
		
		if(existsSync(this.localPath())) {
			// No respective file found
			return this.respond(404);
		}
		
		// Generate and set ETag (header)
		const fd = openSync(this.localPath(), "r");
		const {ino, size, mtimeMs} = fstatSync(fd);
		
		let eTag = `${ino}-${size}-${mtimeMs}`;
		eTag = hash.update(eTag).digest("hex");

		this.setHeader("ETag", eTag);

		// Respond with cache activation status (ressource not modified)
		// if current version has already been served to client
		if(this.getHeader("If-None-Matched") == eTag) {
			super.respond(304);
		}

		this.respond(200);
	}
}