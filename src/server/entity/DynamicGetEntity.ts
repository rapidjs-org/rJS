/**
 * @class
 * Class representing a GET request specific entitiy.
 * To be served without being affected by custom 
 */


const config = {
	...require("../config.json"),

	dynamicCachingDuration: 1000    // TODO: Make configurable? Or use same as for static (mods apply separately)?
};


import {existsSync} from "fs";
import {join, basename, dirname} from "path";

import serverConfig from "../../config/config.server";

import {ClientError} from "../../interface/ClientError";

import {renderModifiers} from "../../mods/modifiers";

import {integratePluginReferences} from "../../interface/plugin/registry";

import {integrateLiveReference} from "../../live/server";

import {IReducedRequestInfo} from "../IReducedRequestInfo";

import {GetEntity} from "./GetEntity";


// TODO: 404 fs map

export class DynamicGetEntity extends GetEntity {
	private isCompound = false;

	/**
     * Create entity object based on web server induced request/response objects.
     * @param {IncomingMessage} req Request object
     * @param {ServerResponse} res Response object
     */
	constructor(req, res) {
		super(req, res);

		this.extension = config.dynamicFileExtension;
	}

	/**
     * Read the dynamic asset (file) implicitly linked to the request.
     * Apply the registered modification handlers accordingly
     * @returns {Buffer} Modified dynamic asset (file) contents.
     */
	protected read(): Buffer {
		let contents = String(super.read());
        
		// Apply registered dynamic file modifiers (plug-in integration, templating, locale adaptions, ...)
		contents = String(renderModifiers(contents, true));	// true: Marking modifications as implicit

		// Integrate plug-in references into head element
		contents = integratePluginReferences(contents, this.isCompound);
		
		// Integrate live functionality client script if envioronment is running in DEV MODE
		contents = integrateLiveReference(contents);
		
		return Buffer.from(contents, "utf-8");
	}

	/**
     * Close entity by performing a response with an individual message.
     * @param {Number} status Status code
     */
	public respond(status: number) {
		// Set specific headers
		!serverConfig.allowFramedLoading
        && this.setHeader("X-Frame-Options", "SAMEORIGIN");

		// Find related error file if response is meant to be unsuccessful
		// TODO: Improve routine / flow
		if(status.toString().charAt(0) != "2") {
			do {
				this.url.pathname = join(dirname(this.url.pathname), `${status}.${config.dynamicFileExtension}`);
			} while(!existsSync(this.localPath()) && this.url.pathname.length > 0);
		}
		
		// Perform definite response
		try {
			super.respond(status, this.read());
		} catch(err) {
			// TODO: Implement endless recursion handling (500, log)?
			if(err instanceof ClientError) {
				return this.respond(err.status);
			}
			
			throw err;
		}
	}

	public process() {
		// Respond with file located at exactly requested path if exists
		if(existsSync(this.localPath())) {
        	return this.respond(200);
		}

		// Find conventional file at path or respective compound page otherwise
		this.url.pathname = join(dirname(this.url.pathname),
			basename(this.url.pathname).replace(/\.[a-z0-9]+$/i, ""),
			basename(this.url.pathname));
		if(existsSync(this.localPath())) {
			this.isCompound = true;

        	return this.respond(200);
		}

		// No suitable file found
		this.respond(404);

		// TODO: Store resolve mapping in order to reduce redunandant processing costs
	}
	
	public getReducedRequestInfo(): IReducedRequestInfo {
		const obj = super.getReducedRequestInfo();

		return {
			...obj,
			
			pathname: this.isCompound ? dirname(this.url.pathname) : this.url.pathname,
    		isCompound: this.isCompound
		};
	}
}