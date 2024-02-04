import { join } from "path";
import { Socket } from "net";
import { BroadcastChannel } from "worker_threads";

import "./file-logs";
import { ThreadPool } from "./ThreadPool";
import { IRequest, IResponse } from "../interfaces";
import { Context } from "../common/Context";
import { socketRespond } from "../common/socket-respond";

import __config from "../__config.json";


process.title = `${__config.appNameShort} process`;


const MAX_CONFIG: Record<string, number> = {
	payloadSize: Context.CONFIG.get<number>("maxPayloadSize") || Infinity,
	uriLength: Context.CONFIG.get<number>("maxURILength") || Infinity,
	headersSize: Context.CONFIG.get<number>("maxHeadersSize") || Infinity
};

const workerBroadcastChannel = new BroadcastChannel("worker-broadcast-channel");
const threadPool: ThreadPool = new ThreadPool(join(__dirname, "../thread/api.thread"))
.on("online", () => {
	process.send("online");
});


process.on("exit", () => console.log(789))

process.on("message", (cmd: string, data: unknown) => {
	switch(cmd) {
		case "terminate":
			return workerBroadcastChannel.postMessage("terminate");
		case "socket":
			return handleSocket(data as Socket);
	}
});


function handleSocket(socket: Socket) {
	socket.on("data", (data: Buffer) => {
		const message: string[] = String(data).split(/\n\s*\n/);
		const messageHead: string[] = message[0].trim().split(/\s*\n/g);
		const messageBody: string = message[1];

		const protocol: string[] = messageHead.shift().split(/\s+/g);
		const method: string = protocol[0];
		const url: string = protocol[1];
		//const version: string = protocol[2];
		
		if(messageBody.length > MAX_CONFIG.payloadSize) {
			respond(socket, 413);
			return;
		}
		if(url.length > MAX_CONFIG.uriLength) {
			respond(socket, 414);
			return;
		}
		if(messageHead.length > MAX_CONFIG.headersSize) {
			respond(socket, 431);
			return;
		}

		const sReq: IRequest = {
			method, url,
			
			headers: Object.fromEntries(
				messageHead
				.map((line: string) => line.split(/\s*:\s*/))
			),
			clientIP: socket.remoteAddress,
			body: messageBody
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
	})
	.on("error", err => {
		console.error(err);		// TODO: Log
	});
}


function respond(...args: unknown[]) {
	socketRespond.apply(null, args);
	
	process.send("done");
}