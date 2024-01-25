import { parentPort } from "worker_threads";

import { TStatusCode } from "../types";
import { IRequest, IResponse } from "../interfaces";
import { Request } from "./Request";
import { AHandler } from "./AHandler";
import { FileHandler } from "./FileHandler";
import { PluginHandler } from "./PluginHandler";
import { Cache } from "./Cache";


new Cache("bbb");

parentPort.on("message", async (sReq: IRequest) => {
	const req: Request = new Request(sReq.method.toUpperCase(), sReq.url, sReq.headers, sReq.body);

	let handler: AHandler;
	switch(req.method) {
	case "GET":
		handler = new FileHandler(req);
		break;
	case "POST":
		handler = new PluginHandler(req);
		break;
	default:
		respondError(405);
		return;
	}

	try {
		handler.once("respond", (sRes: IResponse) => {
			// TODO: Timeout?
            
			parentPort.postMessage(sRes);
		})
		.activate();
	} catch(err: unknown) {
		respondError((typeof(err) === "number") ? err : 500);
	}
});


function respondError(errorStatus: TStatusCode) {
	parentPort.postMessage({
		status: errorStatus,
		headers: {}
	});
}