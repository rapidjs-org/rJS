const http = require("http");
const WebSocketServer = require("websocket").server;

const {readFileSync} = require("fs");
const {join} = require("path");

const utils = require("../utils");

const client = readFileSync(join(__dirname, "./client.js"));


const webServer = http
.createServer()
.listen(9393);

const wsServer = new WebSocketServer({
    httpServer: webServer
});

wsServer.on("request", handleRequest);


let connections = [];


function handleRequest(req) {
    connections.push(req.accept(null, req.origin));
}


function integrateLiveReference(data) {
    return utils.injectIntoHead(data, `
        <script>
            ${client}
        </script>
    `);
}

function proposeRefresh() {
    (connections || []).forEach(connection => {
        connection.sendUTF("1");
    });
}


module.exports = {
    integrateLiveReference,
    proposeRefresh
};