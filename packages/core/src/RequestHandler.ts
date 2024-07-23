import { join } from "path";

import * as rJS_core from "@rapidjs.org/core";

import { TJSON } from "@common/types";

import { ThreadPool } from "./ThreadPool";
import { RateLimiter } from "./RateLimiter";
import { AppConfig } from "./AppConfig";


export class RequestHandler {
	private readonly threadPool: ThreadPool;
	private readonly rateLimiter: RateLimiter;

	constructor(options: TJSON = {}, onlineCallback?: () => void) {
		const optionsWithDefaults: TJSON = {
			workingDir: process.cwd(),
			devMode: false,
            
			...options
		};

		const APP_CONFIG: AppConfig = new AppConfig(optionsWithDefaults.workingDir as string);

		this.threadPool = new ThreadPool(join(__dirname, "./thread/api.thread"), {
			... optionsWithDefaults.devMode ? { baseSize: 1 } : {},
            
			threadOptions: {
				workingDir: optionsWithDefaults.workingDir as string,
				devMode: optionsWithDefaults.devMode as boolean
			}
		})
        .once("online", onlineCallback);

		this.rateLimiter = new RateLimiter(APP_CONFIG.get<number>("maxClientRequestsPerMin"));
	}

	public handle(serialRequest: rJS_core.ISerialRequest): Promise<rJS_core.ISerialResponse> {
		return new Promise(async (resolve, reject) => {
			if(!serialRequest.clientIP) {
				reject(403);

				return;
			}

			if(!this.rateLimiter.grantsAccess(serialRequest.clientIP)) {
				reject(429);

				return;
			}

			this.threadPool.assign(serialRequest)
            .then((serialResponse: rJS_core.ISerialResponse) => resolve(serialResponse))
            .catch((potentialStatus: number|unknown) => reject(potentialStatus));
		});
	}
}