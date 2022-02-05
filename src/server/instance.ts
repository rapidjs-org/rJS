/**
 * Web server instance activating HTTP method handlers and general
 * security guards and routines.
 */


import { readFileSync } from "fs";

import { output } from "../utilities/output";
import {mode} from "../utilities/mode";

import { serverConfig } from "../config/config.server";

import { isClientModuleRequest } from "../interface/plugin/registry";

import { Entity } from "./entity/Entity";
import { PluginEntity } from "./entity/PluginEntity";
import {
	DynamicAssetEntity,
	StaticAssetEntity,
	ClientModuleAssetEntity
} from "./entity/AssetEntity";


// Retrieve server optional server parameter
const options: Record<string, Buffer> = {};
if(serverConfig.ssl) {	// TODO: How to treat in DEV MODE?
	const readCertFile = (pathname: string): Buffer => {
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

// Create main server
require(protocol)
.createServer(options, (req, res) => {
	// Asynchronous request handler
	handleRequest(req, res)
	.catch(err => {
		// Catch bubbling up unhandled errors for display and generic server error response
		output.error(err);
		
		try {
			return (new Entity(req, res)).respond(500);
		} catch(err) {
			output.log("An unexpected error occurred handling a request:");
			output.error(err);
		}
	});
})
.listen(serverConfig.port[protocol], serverConfig.hostname, serverConfig.limit.requestsPending,
() => {
	output.log(`Server started listening on port ${serverConfig.port[protocol]}`);
	mode.DEV && output.log("Running \x1b[1mDEV MODE", null);
});

// Create redirection server (HTTP to HTTPS) if effective protocol is HTTPS
(serverConfig.port.https && serverConfig.port.https)
&& require("http")
.createServer((req, res) => {
	try { 
		return (new Entity(req, res)).redirect(req.url);
	} catch(err) {
		output.log("An unexpected error occurred redirecting a request from HTTP to HTTPS:");
		output.error(err);
	}
})
.listen(serverConfig.port.http, serverConfig.hostname, serverConfig.limit.requestsPending,
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
	switch(req.method.toUpperCase()) {
		case "HEAD": return specificAssetEntity(req, res, true);
		case "GET": return specificAssetEntity(req, res);
		case "POST": return new PluginEntity(req, res);
		default: (new Entity(req, res)).respond(405);
	}
}

function specificAssetEntity(req, res, headerOnly: boolean = false) {
	// Custom plugin client module request
	if(isClientModuleRequest(req.url)) {
		return new ClientModuleAssetEntity(req, res);
	}

	const isDynamic = !/\.[a-z]+(\#.+)?(\?..+)?$/i.test(req.url);
	
	return isDynamic
	? new DynamicAssetEntity(req, res, headerOnly)
	: new StaticAssetEntity(req, res, headerOnly);
}