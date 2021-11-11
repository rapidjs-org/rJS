/**
 * POST handler: Approached upon plug-in channel (endpoint) usage only.
 */

const utils = require("../utils");

const webConfig = require("../support/web-config").webConfig;
const output = require("../support/output");
const locale = require("../support/locale");

const endpoint = require("../interface/endpoint");

const entityHook = require("./entity-hook");


function respond(status, message) {
	message = JSON.stringify(Buffer.isBuffer(message) ? String(message) : message);
	
	entityHook.respond(status, message);
}


/**
 * Handle a POST request accordingly.
 */
module.exports = entity => {
	if(!endpoint.has(entity.url.pathname)) {
		// No related POST handler defined
		respond(404);

		return;
	}

	let blockBodyProcessing;
	let body = [];
	entity.req.on("data", chunk => {
		if(blockBodyProcessing) {
			// Ignore further processing as maximum payload has been exceeded
			return;
		}

		body.push(chunk);

		const bodyByteSize = body.length * 8;
		if(bodyByteSize > webConfig.maxPayloadSize) {
			// Request payload exceeds maximum size as put in web config
			blockBodyProcessing = true;

			respond(413);
		}
	});
	entity.req.on("end", _ => {
		if(blockBodyProcessing) {
			// Ignore further processing as maximum payload has been exceeded
			return;
		}
        
		if(body.length == 0) {
			body = null;
		} else {
			try {
				body = JSON.parse(body);
			} catch(err) {
				throw new SyntaxError(`Endpoint request does not provide a valid JSON body object '${entity.url.pathname}'`);
			}
		}
		
		const internalPathname = entity.url.pathname;
		try {
			entity.url.pathname = body.meta.pathname;
			
			locale.prepare(entity);
			
			try {
				utils.adaptUrl(entity);
			} catch(_) {
				// ...
			}

			let data = endpoint.use(internalPathname, body.body, body.name);
			data = (data === undefined) ? null : data;
			
			respond(200, data);
		} catch(err) {
			output.error(err);

			respond(err.status, err.message || null);
		}
	});
	entity.req.on("error", _ => {
		respond(500);
	});
};