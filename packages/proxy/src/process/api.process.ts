import { join } from "path";
import { Socket } from "net";
import { BroadcastChannel } from "worker_threads";

import "./file-logs";
import { ThreadPool } from "./ThreadPool";
import { __config, IHTTPMessage, IRequest, IResponse, Context, SocketResponder } from "@rapidjs.org/shared";


process.title = `${__config.appNameShort} process`;


const MAX_CONFIG: Record<string, number> = {
	payloadSize: Context.CONFIG.get<number>("maxPayloadSize") || Infinity,
	uriLength: Context.CONFIG.get<number>("maxURILength") || Infinity,
	headersSize: Context.CONFIG.get<number>("maxHeadersSize") || Infinity
};

const workerBroadcastChannel = new BroadcastChannel("worker-broadcast-channel");
const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/api.thread"))
.once("online", () => {	
	process.send("online");
});


// TODO: Default server API, but also raw (?)


process.on("message", (data: unknown, handle?: unknown) => {
	switch(data) {
	case "terminate":
		return workerBroadcastChannel.postMessage("terminate");
	default:
		return handleClientPackage(data as IHTTPMessage, handle as Socket);
	}
});


function handleClientPackage(message: IHTTPMessage, socket: Socket) {
	if(message.body.length > MAX_CONFIG.payloadSize) {
		respond(socket, 413);
		return;
	}
	if(message.url.length > MAX_CONFIG.uriLength) {
		respond(socket, 414);
		return;
	}
	if(Object.entries(message.headers).flat().join("").length > MAX_CONFIG.headersSize) {
		respond(socket, 431);
		return;
	}

	const sReq: IRequest = {
		method: message.method,
		url: message.url,
		headers: message.headers,
		body: message.body,
		clientIP: socket.remoteAddress
	};

	// Assign accordingly prepared request data to worker thread
	threadPool.assign(sReq)
	.then((workerRes: IResponse) => {
		respond(socket, workerRes.status, workerRes.headers, workerRes.message as Uint8Array);
	})
	.catch((err: Error) => {
		console.error(err);	// TODO: Log
		respond(socket, 500);
	});
}


function respond(...args: unknown[]) {
	SocketResponder.respond.apply(null, args);
	
	process.send("done");
}