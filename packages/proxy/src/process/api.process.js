import { join } from "path";
import { BroadcastChannel } from "worker_threads";
import "./file-logs";
import { ThreadPool } from "./ThreadPool";
import { __config, Context, SocketResponder } from "@rapidjs.org/shared";
process.title = `${__config.appNameShort} process`;
const MAX_CONFIG = {
    payloadSize: Context.CONFIG.get("maxPayloadSize") || Infinity,
    uriLength: Context.CONFIG.get("maxURILength") || Infinity,
    headersSize: Context.CONFIG.get("maxHeadersSize") || Infinity
};
const workerBroadcastChannel = new BroadcastChannel("worker-broadcast-channel");
const threadPool = new ThreadPool(join(__dirname, "./thread/api.thread"))
    .once("online", () => {
    process.send("online");
});
// TODO: Default server API, but also raw (?)
process.on("message", (data, handle) => {
    switch (data) {
        case "terminate":
            return workerBroadcastChannel.postMessage("terminate");
        default:
            return handleClientPackage(data, handle);
    }
});
function handleClientPackage(message, socket) {
    if (message.body.length > MAX_CONFIG.payloadSize) {
        respond(socket, 413);
        return;
    }
    if (message.url.length > MAX_CONFIG.uriLength) {
        respond(socket, 414);
        return;
    }
    if (Object.entries(message.headers).flat().join("").length > MAX_CONFIG.headersSize) {
        respond(socket, 431);
        return;
    }
    const sReq = {
        method: message.method,
        url: message.url,
        headers: message.headers,
        body: message.body,
        clientIP: socket.remoteAddress
    };
    // Assign accordingly prepared request data to worker thread
    threadPool.assign(sReq)
        .then((workerRes) => {
        respond(socket, workerRes.status, workerRes.headers, workerRes.message);
    })
        .catch((err) => {
        console.error(err); // TODO: Log
        respond(socket, 500);
    });
}
function respond(...args) {
    SocketResponder.respond.apply(null, args);
    process.send("done");
}
