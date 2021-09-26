const {dirname} = require("path");
const asyncHooks = require("async_hooks");

const webConfig = require("../support/web-config");
const isDevMode = require("../support/is-dev-mode");


const requests = new Map();


const asyncHook = asyncHooks.createHook({
	init: (asyncId, _, triggerAsyncId) => {
		requests.has(triggerAsyncId) && requests.set(asyncId, requests.get(triggerAsyncId));
	},
	destroy: asyncId => {
		requests.has(asyncId) && requests.delete(asyncId);
	}
});

asyncHook.enable();


function create(req, res) {
	// Parse and transfer cookies to reduced request object
	const cookies = {};
	const cookieHeader = req.headers.cookie;
	cookieHeader && cookieHeader.split(";").forEach(cookie => {
		const p = cookie.split("=");
		cookies[p.shift().trim()] = decodeURI(p.join("="));
	});

	// Request associated object to be accessed from independent routines on the related async thread
	requests.set(asyncHooks.executionAsyncId(), {
		req,
		res,

		cookies: {
			received: cookies,
			send: {}
		},
		url: {}
	});
}

function current() {
	return requests.get(asyncHooks.executionAsyncId());
}

function reducedRequestObject() {
	const entity  = current();

	// Construct reduced request object to be passed to each response modifier handler
	return {
		ip: entity.req.headers["x-forwarded-for"] || entity.req.connection.remoteAddress,
		subdomain: entity.url.subdomain,
		pathname: entity.url.isCompound ? dirname(entity.url.pathname) : entity.url.pathname,
		isCompound: entity.url.isCompound,
		... entity.url.isCompound
			? {
				compound: {
					base: entity.url.base,
					args: entity.url.args
				}
			}
			: {},
		locale: {
			lang: entity.url.lang,
			country: entity.url.country
		}	
	};
	// TODO: Provide header values useful for session management?
}


function respond(status, message) {
	const entity  = current();

	entity.res.statusCode = isNaN(status) ? 500 : status;
    
	// Retrieve default message of status code if none given
	!message && (message = require("http").STATUS_CODES[entity.res.statusCode] || "");

	message = Buffer.isBuffer(message) ? message : Buffer.from(message, "utf-8");
    
	entity.res.setHeader("Content-Length", Buffer.byteLength(message));

	if(entity.pageRequest || entity.req.method == "post") {
		// Set (update) cookies
		for(let cookie in entity.cookies.send) {
			let expireDate;    // TODO: Implement
			entity.res.setHeader("Set-Cookie",
				`${cookie}=${entity.cookies.send[cookie]};${expireDate ? `${expireDate};` : ""}${(!isDevMode && webConfig.port.https) ? "Secure; HttpOnly" : ""}`
			);
		}
	}

	entity.res.end(isNaN(status) ? null : message);
}

/**
 * Perform a redirect to a given path.
 * @param {String} path - Path to redirect to
 */
function redirect(path) {
	const entity  = current();

	entity.res.setHeader("Location", path);

	respond(301);
}


module.exports = {
	create,
	current,

	reducedRequestObject,

	respond,
	redirect
};