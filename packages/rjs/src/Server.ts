import { EventEmitter } from "events";
import { IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { DeferredCall } from "./.shared/DeferredCall";
import { THTTPMethod } from "./types";
import { IRequest } from "./api";
import { Context } from "./Context";


export interface IServerOptions {
    port: number;
	
	tls?: {
		cert: string;
		key: string;

		ca?: string[];
	};
}


export class Server extends EventEmitter {
	private readonly options: IServerOptions;
	private readonly context: Context;

	constructor(workingDirPath: string = process.cwd(), options: Partial<IServerOptions> = {}) {
		super();

		this.options = {
			port: 80,
			
			...options
		};

		const onlineDeferral = new DeferredCall(() => this.emit("online"), 2);
		
		this.context = new Context(workingDirPath)
		.on("online", () => onlineDeferral.call());

		((this.options.tls
			? createHTTPSServer
			: createHTTPServer) as Function)
		((dReq: IncomingMessage, dRes: ServerResponse) => {
			new Promise((resolve, reject) => {
				const body: string[] = [];
				dReq.on("readable", () => {
					body.push(dReq.read());
				});
				dReq.on("end", () => resolve(body.join("")));
				dReq.on("error", (err: Error) => reject(err));
			})
			.then((body: string) => {
				const sRes: IRequest = {
					method: dReq.method as THTTPMethod,
					url: dReq.url,
					headers: dReq.headers,
					body: body,
					clientIP: dReq.socket.remoteAddress
				};
				
				this.context
				.handleRequest(sRes, dReq.socket)
				.catch((err: Error) => console.error(err));

				this.emit("request", sRes);
			})
			.catch((err: Error) => {
				dRes.statusCode = 500;
				dRes.end();

				console.error(err);
			})
		})
		.listen(this.options.port, () => onlineDeferral.call());
	}
}