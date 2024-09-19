import { EventEmitter } from "events";
import { IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { THTTPMethod } from "./.shared/global.types";
import { ISerialRequest } from "./.shared/global.interfaces";
import { IClusterSize } from "./local.interfaces";
import { Options } from "./.shared/Options";
import { DeferredCall } from "./DeferredCall";
import { Logger } from "./Logger";
import { Instance } from "./Instance";

import { IHandlerOptions } from "@rapidjs.org/rjs-handler";


export interface IServerOptions {
    port: number;

	tls?: {
		cert: string;
		key: string;
		
		ca?: string[];
	};
}

export function createServer(options?: Partial<IServerOptions & IHandlerOptions>, clusterSize?: IClusterSize): Promise<Server> {
	return new Promise((resolve) => {
		const server: Server = new Server(options, clusterSize)
		.on("online", () => resolve(server));
	});
}

export class Server extends EventEmitter {
	private readonly instance: Instance;

	constructor(options?: Partial<IServerOptions & IHandlerOptions>, clusterSize?: IClusterSize) {
		super();
		
		const optionsWithDefaults: IServerOptions & IHandlerOptions = new Options<IServerOptions & IHandlerOptions>(
			options, {
				port: options.tls ? 80 : 443
			}
		).object;
		
		const onlineDeferral = new DeferredCall(() => this.emit("online"), 2);
		
		this.instance = new Instance(optionsWithDefaults, clusterSize)
		.on("online", () => onlineDeferral.call());

		const logger: Logger = new Logger(options.cwd);
		
		((optionsWithDefaults.tls
			? createHTTPSServer
			: createHTTPServer) as Function)
		((dReq: IncomingMessage, dRes: ServerResponse) => {
			(
				[ "POST" ].includes(dReq.method)
				? new Promise((resolve, reject) => {
					const body: string[] = [];
					dReq.on("readable", () => {
						body.push(dReq.read());
					});
					dReq.on("end", () => resolve(body.join("")));
					dReq.on("error", (err: Error) => reject(err));
				})
				: Promise.resolve(null)
			)
			.then(async (body: string) => {
				const sReq: ISerialRequest = {
					method: dReq.method as THTTPMethod,
					url: dReq.url,
					headers: dReq.headers,
					body: body,
					clientIP: dReq.socket.remoteAddress
				};
				
				this.instance.handleRequest(sReq, dReq.socket)
				.finally(() => dRes.end());
				
				this.emit("request", sReq);
			})
			.catch((err: Error) => {
				dRes.statusCode = 500;
				dRes.end();
				
				logger && logger.error(err);
			})
		})
		.listen(optionsWithDefaults.port, () => onlineDeferral.call());
	}
}