const utils = require("../utils");

const webConfig = require("../support/web-config").webConfig;
const output = require("../support/output");
const locale = require("../support/locale");

const endpoint = require("../interface/endpoint");

const response = require("./response");


function respond(entity, status, message) {
	if(!utils.isString(message)) {
		message = JSON.stringify(Buffer.isBuffer(message) ? String(message) : message);
	}

	response.respond(entity, status, message);
}


/**
 * Handle a POST request accordingly.
 * @param {Object} entity Open connection entity
 */
function handle(entity) {
	if(!endpoint.has(entity.url.pathname)) {
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
			entity.url = locale.prepare({
				pathname: body.meta.pathname
			});
			
			entity.url = utils.getPathInfo(entity.url);

			const data = endpoint.use(internalPathname, body.body, utils.createReducedRequestObject(entity));
			
			respond(entity, 200, data);
		} catch(err) {
			output.log(`An error occurred using the endpoint for plug-in '${internalPathname.slice(1)}':`);
			output.error(err);

			respond(entity, err.status, err.message || null);
		}
	});
	entity.req.on("error", _ => {
		respond(entity, 500);
	});
}


module.exports = handle;