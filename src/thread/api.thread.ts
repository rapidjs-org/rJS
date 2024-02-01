import { parentPort, BroadcastChannel } from "worker_threads";

import { TStatusCode } from "../process/types";
import { IRequest, IResponse } from "../process/interfaces";
import { Request } from "./Request";
import { AHandler } from "./AHandler";
import { FileHandler } from "./FileHandler";
import { PluginHandler } from "./PluginHandler";
import { RateLimiter } from "./RateLimiter";
import { Context } from "../common/Context";
import { freeAll } from "./sharedmemory/api.sharedmemory";


new BroadcastChannel("worker-broadcast-channel")
.onmessage = (event: { data: string }) => {
	if(event.data !== "terminate") return;
	
	freeAll();
};

const rateLimiter: RateLimiter = new RateLimiter(Context.CONFIG.get<number>("maxClientRequests"));


console.log("Thread message");


parentPort.on("message", async (sReq: IRequest) => {
	/* if(!rateLimiter.grantsAccess(sReq.clientIP)) {
		respondError(429);
		
		return;
	} */
	
	const req: Request = new Request(sReq.method.toUpperCase(), sReq.url, sReq.headers, sReq.body);
	
	let handler: AHandler;
	switch(req.method) {
		case "GET":
		case "HEAD":
			handler = new FileHandler(req);
			break;
		case "POST":
			handler = new PluginHandler(req);
			break;
		default:
			respondError(405);

			return;
	}

	handler.once("respond", (sRes: IResponse) => {
		sRes.message = (req.method !== "HEAD") ? sRes.message : null;
		
		parentPort.postMessage(sRes);
	})
	.once("timeout", () => {
		handler.removeAllListeners("respond");
		
		respondError(408);
	});

	try {
		handler.activate();
	} catch(err: unknown) {
		console.log(err);	// TODO: Log
		respondError(typeof(err) === "number" ? err : 500);
	}
});


function respondError(errorStatus: TStatusCode) {
	parentPort.postMessage({
		status: errorStatus,
		headers: {}
	});
}