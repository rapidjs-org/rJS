/**
 * Web server instance activating HTTP method handlers and general
 * security guards and routines.
 */

import config from "../config.json";


import * as http from "http";
import * as https from "https";
import {readFileSync} from "fs";
import {join, dirname, extname} from "path";

import isDevMode from "../utilities/is-dev-mode";
import * as output from "../utilities/output";
import {normalizeExtension} from "../utilities/normalize";

import serverConfig from "../config/config.server";

import {rateExceeded} from "./support/rate-limiter";

import {Entity} from "./entity/Entity";
import {StaticGetEntity} from "./entity/StaticGetEntity";
import {DynamicGetEntity} from "./entity/DynamicGetEntity";
import {PostEntity} from "./entity/PostEntity";

import {createHook} from "./hook";
const entityConstructor = {
	BASIC: Entity,
	GET: {
		STATIC: StaticGetEntity,
		DYNAMIC: DynamicGetEntity
	},
	POST: PostEntity
};


// Retrieve server optional server parameter
const options: Record<string, Buffer> = {};
if(serverConfig.ssl) {
	const readCertFile = (pathname: string): Buffer => {
		// Construct application relative path if not given in absolute format
		pathname = (pathname.charAt(0) == "/") ? pathname : join(dirname(require.main.filename), pathname);
        
		return readFileSync(pathname);
	};
    
	options.cert = serverConfig.ssl.certFile ? readCertFile(serverConfig.ssl.certFile) : null;
	options.key = serverConfig.ssl.keyFile ? readCertFile(serverConfig.ssl.keyFile) : null;
	options.dhparam = serverConfig.ssl.dhParam ? readCertFile(serverConfig.ssl.dhParam) : null;
}


// Create effective web server instance (for HTTPS if defined, HTTP otherwise)
const protocol = serverConfig.port.https
	? "https"
	: "http";

(serverConfig.port.https
	? https
	: http)
	.createServer(options, handleRequest)
	.listen(serverConfig.port[protocol], serverConfig.hostname, serverConfig.maxPending,
		() => {
			output.log(`Server started listening on port ${serverConfig.port[protocol]}`);
			isDevMode && output.log("Running DEV MODE");
		});

// Create redirection server (HTTP to HTTPS) if effective protocol is HTTPS
(serverConfig.port.https) && 
http
	.createServer((req, res) => {
		(new entityConstructor.BASIC(req, res)).redirect(`https://${req.headers.host}${req.url}`);
	})
	.listen(serverConfig.port.http, serverConfig.hostname, serverConfig.maxPending,
		() => {
			// Use set up HTTP port for redirection (80 by default (recommended))
			output.log(`HTTP (:${serverConfig.port.http}) to HTTPS (:${serverConfig.port.https}) redirection enabled`);
		});


/**
 * Handle a single request asynchronously.
 * @async
 * @param {IncomingMessage} req Request object
 * @param {ServerResponse} res Response object
 */
async function handleRequest(req, res) {
	// Retrieve entity type first (or close response if can not be mapped accordingly)
	let entity;
	switch(req.method.toUpperCase()) {
	case "GET": {
		// (Initial) asset request
		const extension = extname(req.url);
		const normalizedExtension = extension ? normalizeExtension(extension) : config.dynamicFileExtension;

		entity = new entityConstructor.GET[(normalizedExtension == config.dynamicFileExtension) ? "DYNAMIC" : "STATIC"](req, res);

		if(entity instanceof entityConstructor.GET.DYNAMIC
				&& extension.length == 0) {
			// Redirect dynamic request with extension explicitly stated in URL to implicit equivalent
			return entity.redirect(req.url.replace(new RegExp(`\\.${config.dynamicFileExtension}($|\\?)`), "$1"));
		}

		break;
	}
	case "POST": {
		// Plug-in channel request
		entity = new entityConstructor.POST(req, res);

		break;
	}
	default: {
		// Block request as HTTP method is not supported
		return (new entityConstructor.BASIC(req, res)).respond(405);
	}
	}

	// Store hook to entity
	createHook(entity);
    
	// Block request if URL is exceeding the maximum length
	if(req.url.length > serverConfig.maxUrlLength) {
		return entity.respond(414);
	}

	// Block request if individual request maximum reached (rate limiting)
	if(rateExceeded(req.connection.remoteAddress)) {
		entity.setHeader("Retry-After", 30000); // Retry after half the rate limiting period time
        
		return entity.respond(429);
	}

	// TODO: Implement subdomain processing
    
	// Call entity specific request processor method
	try {
		entity.process();
	} catch(err) {
		// Catch bubbling up unhandled errors for display and generic server error response
		output.error(err);

		entity.respond(500);
	}
}