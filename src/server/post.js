const utils = require("../utils");

const response = require("./response");

const webConfig = require("../support/config").webConfig;

const output = require("../support/output");
const endpoint = require("../interface/endpoint");


function respond(entity, status, message) {
	if(!utils.isString(message) && !Buffer.isBuffer(message)) {
		message = JSON.stringify(message);
	}

	response.respond(entity, status, message);
}


/**
 * Handle a POST request accordingly.
 * @param {Object} entity Open connection entity
 */
function handle(entity) {
	if(!endpoint.hasEndpoint(entity.url.pathname)) {
		// No related POST handler defined
		respond(entity, 404);

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

		const bodyByteSize = (JSON.stringify(JSON.parse(body)).length * 8);
		if(bodyByteSize > webConfig.maxPayloadSize) {
			// Request payload exceeds maximum size as put in web config
			blockBodyProcessing = true;

			respond(entity, 413);

			//entity.req.end();
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
				throw new SyntaxError(`POST request does not provide a valid JSON body object '${entity.url.pathname}'`);
			}
		}

		try {
			let data = endpoint.useEndpoint(entity.url.pathname, body);
			
			respond(entity, 200, data);
		} catch(err) {
			output.error(err);

			respond(entity, err.status, err.message ? JSON.stringify(err.message) : null);
		}
	});
	entity.req.on("error", _ => {
		respond(entity, 500);
	});
}


module.exports = handle;