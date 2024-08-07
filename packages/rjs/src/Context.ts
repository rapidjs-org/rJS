import { STATUS_CODES } from "http";
import { EventEmitter } from "events";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { Socket } from "net";

import { ISerialRequest, ISerialResponse } from "./interfaces";
import { TStatus, TSerializable, THTTPMethod } from "./types";
import { IRequest, IResponse } from "./api";
import { AppConfig } from "./config/AppConfig";
import { ThreadPool } from "./ThreadPool";
import { RateLimiter } from "./RateLimiter";
import { Cache } from "./Cache";

import _config from "./_config.json";


export class Context extends EventEmitter {
	private readonly appConfig: AppConfig;
	private readonly rateLimiter: RateLimiter;
	private readonly responseCache: Cache<Partial<ISerialRequest>, Partial<ISerialResponse>>;
	private readonly threadPool: ThreadPool;

	constructor(workingDirPath: string) {
		super();

		this.appConfig = new AppConfig(workingDirPath);

		if(!existsSync(resolve(this.appConfig.read("filesDirName").string() ?? _config.defaultFilesDirName))) {
			throw new SyntaxError(`Missing application minimal public files directory (${_config.defaultFilesDirName})`);
		}
		
		this.rateLimiter = new RateLimiter(this.appConfig.read("security", "maxRequestsPerMin").number());
		this.responseCache = new Cache(this.appConfig.read("peformance", "serverCacheMs").number());
		this.threadPool = new ThreadPool(join(__dirname, "./thread/api.thread"), workingDirPath, {    
			...process.env.DEV ? { baseSize: 1 } : {}
		})
		.once("online", () => this.emit("online"));
	}

	private close(sResPartial: Partial<ISerialResponse>, socket?: Socket, closeSocket: boolean = false): ISerialResponse {
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

	private closeWithError(status: TStatus, socket?: Socket): ISerialResponse {
		return this.close({ status }, socket, true);
	}

	public async handleRequest(sReq: IRequest, socket?: Socket): Promise<IResponse> {
		return new Promise((resolve, reject) => {
			// Security
			if(!this.rateLimiter.grantsAccess(sReq.clientIP)) {
				resolve(this.closeWithError(429, socket));

				return;
			}
			if(sReq.url.length > this.appConfig.read("security", "maxRequestURILength").number()) {
				resolve(this.closeWithError(414, socket));

				return;
			}
			if((sReq.body ?? "").length > this.appConfig.read("security", "maxRequestBodyByteLength").number()) {
				resolve(this.closeWithError(413, socket));

				return;
			}
			if(
				Object.entries(sReq.headers)
				.reduce((acc: number, cur: [ string, TSerializable ]) => acc + cur[0].length + cur[1].toString().length, 0)
				> this.appConfig.read("security", "maxRequestHeadersLength").number()
			) {
				resolve(this.closeWithError(431, socket));
				
				return;
			}

			const cacheKey: Partial<ISerialRequest> = {
				method: sReq.method as THTTPMethod,
				url: sReq.url   // TODO: Consider query part? No-cache signal? ...
			};

			if(this.responseCache.has(cacheKey)) {
				resolve(this.close(this.responseCache.get(cacheKey), socket));

				return;
			}

			this.threadPool
			.assign(sReq as ISerialRequest)
			.then((sRes: Partial<ISerialResponse>) => {
				this.responseCache.set(cacheKey, sRes);

				resolve(this.close(sRes, socket));
			})
			.catch((err: unknown) => {
				this.closeWithError((typeof(err) === "number") ? err as TStatus : 500, socket);
				
				reject(err);
			});
		});
	}
}