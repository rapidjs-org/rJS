import _config from "./_config.json";

process.title = `rJS ${_config.processTitle}`;


import { join } from "path";
import { STATUS_CODES, IncomingMessage, ServerResponse, createServer as createHTTPServer } from "http";
import { createServer as createHTTPSServer } from "https";
import { Socket } from "net";

import { DeferredCall } from "./.shared/DeferredCall";
import { THTTPMethod, TSerializable, TStatus } from "./types";
import { ISerialRequest, ISerialResponse } from "./interfaces";
import { ThreadPool } from "./ThreadPool";
import { RateLimiter } from "./RateLimiter";
import { Cache } from "./Cache";
import { Config } from "./Config";


// TODO: Check if is valid project dir at CWD


const onlineDeferral = new DeferredCall(null, 2);
const rateLimiter: RateLimiter = new RateLimiter(Config.global.read("security", "maxRequestsPerMin").number());
const responseCache: Cache<Partial<ISerialRequest>, Partial<ISerialResponse>> = new Cache();
const threadPool: ThreadPool = new ThreadPool(join(__dirname, "./thread/api.thread"), {    
	...process.env.DEV ? { baseSize: 1 } : {}
})
.once("online", () => onlineDeferral.call());


function respond(sResPartial: Partial<ISerialResponse>, socket?: Socket, closeSocket: boolean = false): ISerialResponse {
	const completeResponse = (sResPartial: Partial<ISerialResponse>): ISerialResponse => {
		return {
			status: 200,
			headers: {},
	
			...sResPartial
		};
	};
	
	if(!socket) return completeResponse(sResPartial);

	const status: TStatus = sResPartial.status ?? 500;

	const data: (string|Buffer)[] = [];
	data.push(`HTTP/1.1 ${status ?? 500} ${STATUS_CODES[status]}`);
	data.push(
		...Object.entries(sResPartial.headers ?? {})
        .map((entry: [ string, string|readonly string[] ]) => `${entry[0]}: ${entry[1]}`)
	);
    
	socket.write(Buffer.concat([
		Buffer.from(data.join("\r\n"), "utf-8"),
		Buffer.from("\r\n\r\n"),
		sResPartial.body ?? Buffer.from("")
	]), (err?: Error) => {
		err && console.error(err);
	});
	
	closeSocket
	&& socket.end(() => socket.destroy());
	
	return completeResponse(sResPartial);
}

function respondError(status: TStatus, socket?: Socket): ISerialResponse {
	return respond({ status }, socket, true);
}


export interface IRequest extends Omit<ISerialRequest, "method"> {
	method: string;
};

export interface IResponse extends ISerialResponse {}

export interface IServerOptions {
    port: number;
	
	tls?: {
		cert: string;
		key: string;

		ca?: string[];
	};
}


export async function handleRequest(sReq: IRequest, socket?: Socket): Promise<IResponse> {
	return new Promise((resolve, reject) => {
		// Security
		if(!rateLimiter.grantsAccess(sReq.clientIP)) {
			resolve(respondError(429, socket));

			return;
		}
		if(sReq.url.length > Config.global.read("security", "maxRequestURILength").number()) {
			resolve(respondError(414, socket));

			return;
		}
		if((sReq.body ?? "").length > Config.global.read("security", "maxRequestBodyByteLength").number()) {
			resolve(respondError(413, socket));

			return;
		}
		if(
			Object.entries(sReq.headers)
			.reduce((acc: number, cur: [ string, TSerializable ]) => acc + cur[0].length + cur[1].toString().length, 0)
			> Config.global.read("security", "maxRequestHeadersLength").number()
		) {
			resolve(respondError(431, socket));
			
			return;
		}

		const cacheKey: Partial<ISerialRequest> = {
			method: sReq.method as THTTPMethod,
			url: sReq.url   // TODO: Consider query part?
		};

		if(responseCache.has(cacheKey)) {
			resolve(respond(responseCache.get(cacheKey), socket));

			return;
		}
				
		threadPool.assign(sReq as ISerialRequest)
		.then((sRes: Partial<ISerialResponse>) => {
			responseCache.set(cacheKey, sRes);
			
			resolve(respond(sRes, socket));
		})
		.catch((err: unknown) => {
			respondError((typeof(err) === "number") ? err as TStatus : 500, socket);
			
			reject(err);
		});
	});
}

export function serve(options: Partial<IServerOptions>, dryHandler: ((sReq: IRequest) => void) = () => {}): Promise<void> {
	const optionsWithDefaults = {
		port: 80,
		
		...options
	};

	return new Promise((resolve) => {
		// TODO: HTTPS option, multiplex on proxy
		((optionsWithDefaults.tls
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
				
            	handleRequest(sRes, dReq.socket)
				.catch((err: Error) => console.error(err));

				dryHandler(sRes);
            })
            .catch((err: Error) => {
            	dRes.statusCode = 500;
            	dRes.end();

            	console.error(err);
            })
		})
        .listen(optionsWithDefaults.port, () => onlineDeferral.call(resolve));
	});
}