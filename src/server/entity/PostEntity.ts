/**
 * @class
 * Class representing a POST request specific entitiy.
 * To be exclusively used for plug-in channel maintenance.
 * 
 */


import * as output from "../../utilities/output";


import serverConfig from "../../config/config.server";

import {ClientError} from "../../interface/ClientError";
import {has as endpointHas, use as endpointUse} from "../../interface/plugin/endpoint";

import {Entity} from "./Entity";


interface IPostBody {
	meta: Record<string, string>;
	name: string;

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
      * Close entity by performing a response with an individual message.
      * @param {number} status Status code
      * @param {Buffer} [message] Message data
      */
	public respond(status: number, message?: Buffer) {
		// Perform definite response
		super.respond(status, message);
	}

	public process() {
		const pluginName: string = this.url.pathname.replace(/^\//, "");	// Preserve actually requested pathname

		if(!endpointHas(pluginName)) {
			// No related POST handler defined
			return this.respond(404);
		}

		let blockBodyProcessing = false;
		const body = [];

		this.req.on("data", chunk => {
			if(blockBodyProcessing) {
				// Ignore further processing as maximum payload has been exceeded
				return;
			}

			body.push(chunk);

			if((body.length * 8) <= serverConfig.maxPayloadSize) {
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
			let bodyObj: IPostBody;
			try {
				bodyObj = (body.length > 0) ? JSON.parse(body.toString()) : null;
			} catch(err) {
				throw new SyntaxError(`Error parsing endpoint request body '${this.url.pathname}'`);
			}
			
			if(!endpointHas(pluginName, bodyObj.name)) {
				// No related POST handler defined
				return this.respond(404);
			}
			
			try {
				// Adapt representative URL to the individual plug-in origin respective document URL
				this.url.pathname = bodyObj.meta.pathname;

				try {
					const data: Buffer = endpointUse(pluginName, bodyObj.body, bodyObj.name);

					this.respond(200, data);
				} catch(err) {
					if(err instanceof ClientError) {
						return this.respond(err.status);
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

	public getReducedRequestInfo(): IReducedRequestInfo {
		return {
			...super.getReducedRequestInfo(),

			isCompound: false
		};
	}
}

// TODO: Client error handling (throw approach)