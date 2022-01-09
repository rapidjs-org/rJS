/**
 * @class
 * Class representing a POST request specific entitiy.
 * To be exclusively used for plug-in channel maintenance.
 * 
 */


import * as output from "../../utilities/output";


import serverConfig from "../../config/config.server";

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
      * Close entity by performing a response with an individual message.
      * @param {number} status Status code
      * @param {Buffer} [message] Message data
      */
	public respond(status: number, message?: Buffer) {
		// TODO: Cache!
		
		// Perform definite response
		super.respond(status, message);
	}

	public process() {
		let blockBodyProcessing: boolean = false;
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
			|| !endpointHas(payload.pluginName, payload.endpointName)) {
				// No related endpoint found
				return this.respond(404);
			}

			super.process();
			
			try {
				try {
					const data: Buffer = endpointUse(payload.pluginName, payload.body, payload.endpointName);

					this.respond(200, data);
				} catch(err) {
					if(err instanceof ResponseError) {
						return this.respond(err.status, Buffer.from(err.message, "utf-8"));
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

			isCompound: false 	// TODO: Set
		};
	}
}

// TODO: Client error handling (throw approach)