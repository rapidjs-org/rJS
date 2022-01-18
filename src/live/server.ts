/**
 * Live functionality websocket server to communicate relevant
 * file modifications to connected clients.
 */


import http from "http";
import {readFileSync} from "fs";
import {join} from "path";
import {server as WebSocketServer} from "websocket";

import isDevMode from "../utilities/is-dev-mode";
import {injectIntoHead} from "../utilities/markup";


// Read client script
const clientScript = String(readFileSync(join(__dirname, "../client/live.js")));


// Connections array to be worked as list
const connections = [];

if(isDevMode) {
	// Create substantial HTTP server
	const webServer = http
		.createServer()
		.listen(9393);

	// Create web socket server instance
	const wsServer = new WebSocketServer({
		httpServer: webServer
	});

	/**
	 * Handle web socket request.
	 * Add request to list of connections.
	 * @param {IncomingMessage} req Incoming request
	 */
	wsServer.on("request", _ => {
		(connections || []).forEach(connection => {
			connection.sendUTF("1");
		});
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
	return injectIntoHead(String(markup), `
        <script>
            ${clientScript}
        </script>
    `);
}