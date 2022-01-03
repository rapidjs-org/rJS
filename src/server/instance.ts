/**
 * Web server instance activating HTTP method handlers and general
 * security guards and routines.
 */

import config from "../config.json";


import {readFileSync, stat} from "fs";
import {join, dirname, extname} from "path";

import * as output from "../utilities/output";
import isDevMode from "../utilities/is-dev-mode";
import {normalizeExtension} from "../utilities/normalize";

import serverConfig from "../config/config.server";

import {rateExceeded} from "./support/rate-limiter";

import {isClientModuleRequest} from "../interface/plugin/registry";

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
if(serverConfig.ssl) {	// TODO: How to treat for DEV MODE?
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
const protocol: string = serverConfig.port.https
	? "https"
	: "http";

require(protocol)
	.createServer(options, (req, res) => {
		try {
			handleRequest(req, res);	// Asynchronous request handler
		} catch(err) {
			// Catch bubbling up unhandled errors for display and generic server error response
			output.error(err);

			(new entityConstructor.BASIC(null, res)).respond(500);
		}
	})
	.listen(serverConfig.port[protocol], serverConfig.hostname, serverConfig.maxPending,
		() => {
			output.log(`Server started listening on port ${serverConfig.port[protocol]}`);
			isDevMode && output.log("Running DEV MODE");
		});

// Create redirection server (HTTP to HTTPS) if effective protocol is HTTPS
serverConfig.port.https
&& require("http")
	.createServer((req, res) => {
		(new entityConstructor.BASIC(null, res)).redirect(req.url);
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
	// TODO: Enhance client module request processing?
	
	// Retrieve entity type first (or close response if can not be mapped accordingly)
	let entity;
	switch(req.method.toUpperCase()) {
	case "GET": {
		// (Initial) asset request
		const extension = extname(req.url);
		const normalizedExtension = extension ? normalizeExtension(extension) : config.dynamicFileExtension;

		entity = new entityConstructor.GET[
			(normalizedExtension == config.dynamicFileExtension
			&& !isClientModuleRequest(req.url))
			? "DYNAMIC"
			: "STATIC"
		](req, res);

		break;
	}
	case "POST": {
		// Plug-in channel request
		entity = new entityConstructor.POST(req, res);

		break;
	}
	default: {
		// Block request as HTTP method is not supported
		return (new entityConstructor.BASIC(null, res)).respond(405);
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
		entity.setHeader("Retry-After", 30000); // Retry after half the rate limiting period length
        
		return entity.respond(429);
	}

	// Enforce configured www strategy
	// TODO: Ignore on localhost (/ numerical)?
	if(serverConfig.www === "yes") {
		if(!entity.subdomain[0] || entity.subdomain[0] !== "www") {
			return entity.redirect(entity.url.pathname, `www.${entity.url.hostname}`);
		}
	} else if(serverConfig.www === "no") {
		if(entity.subdomain[0] && entity.subdomain[0] === "www") {
			return entity.redirect(entity.url.pathname, entity.url.hostname.replace(/^www\./, ""));
		}
	}
	
	// Call entity specific request processor method
	entity.process();
}