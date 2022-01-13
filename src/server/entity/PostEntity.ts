/**
 * @class
 * Class representing a POST request specific entitiy.
 * To be exclusively used for plug-in channel maintenance.
 * 
 */

import config from "../../config.json";


import serverConfig from "../../config/config.server";

import * as output from "../../utilities/output";

import {ResponseError} from "../../interface/ResponseError/ResponseError";
import {has as endpointHas, use as endpointUse} from "../../interface/plugin/endpoint";

import {Entity} from "./Entity";


interface IPostBody {
	pluginName: string;

	endpointName?: string;
	body?: unknown;
}


export class PostEntity extends Entity {
	/**
      * Create entity object based on web server induced request/response objects.
      * @param {IncomingMessage} req Request object
      * @param {ServerResponse} res Response object
      */
	constructor(req, res) {
		super(req, res);
	}

	/**
     * Construct local disc path to asset ressource.
     * @returns {String} Local ressource path
     */
	 protected localPath(): string {
    	return `${super.localPath()}.${config.dynamicFileExtension}`;
	}

	public process() {
		let blockBodyProcessing = false;
		const body = [];
		
		this.req.on("data", chunk => {
			if(blockBodyProcessing) {
				// Ignore further processing as maximum payload has been exceeded
				return;
			}

			body.push(chunk);

			if((body.length * 8) <= serverConfig.limit.payloadSize) {
				// Continue on body stream as payload limit not yet reached
				return;
			}

			// Abort processing as bdy payload exceeds maximum size
			// Limit to be optionally set in server configuration file
			this.respond(413);

			blockBodyProcessing = true;
		});

		this.req.on("end", () => {
			if(blockBodyProcessing) {
				// Ignore further processing as maximum payload has been exceeded
			}

			// Parse payload
			let payload: IPostBody;
			try {
				payload = (body.length > 0) ? JSON.parse(body.toString()) : null;
			} catch(err) {
				throw new SyntaxError(`Error parsing endpoint request body '${this.url.pathname}'`);
			}
			if(!endpointHas(payload.pluginName)
			&& !endpointHas(payload.pluginName, payload.endpointName)) {
				// No related endpoint found
				return this.respond(404);
			}
			
			this.processPagePath();	// TODO: Async?
			
			super.process();
			
			try {
				try {
					const data: Buffer = endpointUse(payload.pluginName, payload.body, payload.endpointName);
					
					this.respond(200, data);
				} catch(err) {
					if(err instanceof ResponseError) {
						return this.respond(err.status, Buffer.from(JSON.stringify(err.message), "utf-8"));
					}

					throw err;
				}
			} catch(err) {
				output.error(err);

				this.respond(err.status, err.message);
			}
		});

		this.req.on("error", err => {
			throw err;
		});
	}
}