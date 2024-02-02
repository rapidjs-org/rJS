import { STATUS_CODES } from "http";
import { join } from "path";
import { Socket } from "net";
import { BroadcastChannel } from "worker_threads";

import { ThreadPool } from "./ThreadPool";
import { IRequest, IResponse } from "../interfaces";
import { THeaders, TStatusCode } from "../types";
import { Context } from "../common/Context";

import __config from "../__config.json";


const _config = {
	httpVersion: "1.1"
};


process.title = `${__config.appNameShort} process`;


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
		
		if(messageBody.length > Context.CONFIG.get<number>("maxPayloadSize")) {
			respond(socket, 413);
			return;
		}
		if(url.length > Context.CONFIG.get<number>("maxURILength")) {
			respond(socket, 414);
			return;
		}
		if(messageHead.length > Context.CONFIG.get<number>("maxHeadersSize")) {
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


function respond(socket: Socket, status: TStatusCode, headers: THeaders = {}, message?: Uint8Array) {
	const CRLF = "\r\n";
	socket.write(`${
		`HTTP/${_config.httpVersion} ${status} ${STATUS_CODES[status]}`
	}${CRLF}${
		Object.entries(headers)
		.map((value: [ string, string ]) => `${value[0]}: ${value[1]}`)
		.join(CRLF)
	}${CRLF}${message ? CRLF : ""}`);
	
	socket.write(message ?? "");
	
	socket.end();

	process.send("done");
}