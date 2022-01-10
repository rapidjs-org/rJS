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
import isDevMode from "../../utilities/is-dev-mode";

import {GetEntity} from "./GetEntity";


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
     * @param {Buffer} [message] Response message
     */
	public respond(status: number, message?: Buffer) {
		// Conceal status (always use 404) if enabled
		if(status.toString().charAt(0) != "2"
			&& status !== 404
			&& serverConfig.concealing404 === true) {
			return this.respond(404);
		}
		
		// Set cache control headers
	   	(!isDevMode && serverConfig.cachingDuration.client)
        && this.setHeader("Cache-Control", `public, max-age=${serverConfig.cachingDuration.client}, must-revalidate`);
		
		// Perform definite response
		super.respond(status, message);
	}

	public process() {
		super.process();
		
		// Custom plufg-in client module file request handling
		if(isClientModuleRequest(this.url.pathname)) {
			this.extension = "js";

			return super.respond(200, retrieveClientModules(this.url.pathname));
		}
		
		if(!existsSync(this.localPath())) {
			// No respective file found
			return this.respond(404);
		}

		if(isDevMode) {
			// No ETag in DEV MODE (always reload)
			return this.respond(200, super.read());
		}

		// Generate and set ETag (header)
		// Construct ETag from md5 hashed dash separated modification relevant file stats
		const fileDescriptor: number = openSync(this.localPath(), "r");
		const {ino, size, mtimeMs} = fstatSync(fileDescriptor);
		let eTag = `${ino}-${size}-${mtimeMs}`;
		eTag = createHash("md5").update(eTag).digest("hex");

		this.setHeader("ETag", eTag);
		
		// Respond with cache activation status (ressource not modified)
		// if current version has already been served to client
		if(this.getHeader("If-None-Matched") == eTag) {
			super.respond(304);
		}

		this.respond(200, super.read());
	}
}