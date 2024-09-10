import { EventEmitter } from "events";
import { IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";

import { THTTPMethod } from "./.shared/global.types";
import { ISerialRequest } from "./.shared/global.interfaces";
import { Options } from "./.shared/Options";
import { Logger } from "./.shared/Logger";
import { DeferredCall } from "./.shared/DeferredCall";
import { Scope } from "./Scope";

import { ICoreOptions } from "@rapidjs.org/rjs-core";


export interface IServerOptions {
    port: number;

	tls?: {
		cert: string;
		key: string;

		ca?: string[];
	};
}


export class Server extends EventEmitter {
	private readonly scope: Scope;

	constructor(options: Partial<IServerOptions & ICoreOptions> = {}) {
		super();
		
		const optionsWithDefaults: IServerOptions & ICoreOptions = new Options<IServerOptions & ICoreOptions>(
			options, {
				port: 80
			}
		).object;
		
		const onlineDeferral = new DeferredCall(() => this.emit("online"), 2);
		
		this.scope = new Scope(optionsWithDefaults)
		.on("online", () => onlineDeferral.call());

		const logger: Logger = new Logger(this.scope.options.cwd);
		
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
			.then((body: string) => {
				const sReq: ISerialRequest = {
					method: dReq.method as THTTPMethod,
					url: dReq.url,
					headers: dReq.headers,
					body: body,
					clientIP: dReq.socket.remoteAddress
				};
				
				this.scope.handleRequest(sReq, dReq.socket);
				
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