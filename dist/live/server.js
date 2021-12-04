"use strict";
/**
 * Live functionality websocket server to communicate relevant
 * file modifications to connected clients.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrateLiveReference = exports.proposeRefresh = void 0;
const http_1 = __importDefault(require("http"));
const fs_1 = require("fs");
const path_1 = require("path");
const websocket_1 = require("websocket");
const markup_1 = require("../utilities/markup");
// Read client script
const clientScript = String((0, fs_1.readFileSync)((0, path_1.join)(__dirname, "client.js")));
// Create substantial HTTP server
const webServer = http_1.default
    .createServer()
    .listen(9393);
// Create web socket server instance
const wsServer = new websocket_1.server({
    httpServer: webServer
});
wsServer.on("request", handleRequest);
// Connections array to be worked as list
const connections = [];
/**
 * Handle web socket request.
 * Add request to list of connections.
 * @param {IncomingMessage} req Incoming request
 */
function handleRequest(req) {
    const connection = req.accept(null, req.origin);
    connections.push(connection);
}
/**
 * Porpose a refresh activity to the client.
 */
function proposeRefresh() {
    (connections || []).forEach(connection => {
        connection.sendUTF("1");
    });
}
exports.proposeRefresh = proposeRefresh;
/**
 * Integrate client script into markup.
 * @param {Buffer} markup Markup to integrate client script in
 * @returns {Buffer} Markup with client script in head tag
 */
function integrateLiveReference(markup) {
    return (0, markup_1.injectIntoHead)(String(markup), `
        <script>
            ${clientScript}
        </script>
    `);
}
exports.integrateLiveReference = integrateLiveReference;
