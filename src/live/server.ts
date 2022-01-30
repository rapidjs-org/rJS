/**
 * Live functionality websocket server to communicate relevant
 * file modifications to connected clients.
 */

import config from "../config.json";


import http from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { server as WebSocketServer } from "websocket";

import {mode} from "../utilities/mode";
import { injectIntoHead } from "../utilities/markup";


// Read client script
const clientScript = String(readFileSync(join(__dirname, "../client/live.js")))
.replace(/@WS_PORT/, String(config.wsPort));	// With configured websocket port (substitution)

// Connections array to be worked as list
const connections = [];

if(mode.DEV) {
	// Create substantial HTTP server
	const webServer = http
		.createServer()
		.listen(config.wsPort);

	// Create web socket server instance upon
	const wsServer = new WebSocketServer({
		httpServer: webServer
	});

	/**
	 * Handle web socket request.
	 * Add request to list of connections.
	 * @param {IncomingMessage} req Incoming request
	 */
	wsServer.on("request", req => {
		const connection = req.accept(null, req.origin);
		connections.push(connection);
	});
}


/**
 * Porpose a refresh activity to the client.
 */
export function proposeRefresh() {
	(connections || []).forEach(connection => {
		connection.sendUTF("1");
	});
}

/**
 * Integrate client script into markup.
 * @param {Buffer} markup Markup to integrate client script in
 * @returns {Buffer} Markup with client script in head tag
 */
export function integrateLiveReference(markup: string): string {
	return mode.DEV
		? injectIntoHead(String(markup), `
        <script>
            ${clientScript}
        </script>
    `)
		: markup;
}