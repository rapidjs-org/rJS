import { IRequest, IResponse } from "interfaces";

import { TStatusCode } from "types";
import { AHandler } from "./AHandler";
import { FileHandler } from "./FileHandler";
import { PluginHandler } from "./PluginHandler";

import { freeAll } from "./sharedmemory/api.sharedmemory";


export async function handle(sReq: IRequest): Promise<IResponse> {
	const respondError = (errorStatus: TStatusCode): IResponse => {
		return {
			status: errorStatus
		};
	};
	
	return new Promise((resolve) => {
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
			resolve(respondError(405));

			return;
		}
		
		handler.once("respond", (sRes: IResponse) => {
			sRes.message = (req.method !== "HEAD") ? sRes.message : null;
			
			resolve(sRes);
		})
		.once("timeout", () => {
			handler.removeAllListeners("respond");
			
			resolve(408);
		});

		try {
			handler.activate();
		} catch(err: unknown) {
			console.log(err);	// TODO: Log
			
			resolve(respondError(typeof(err) === "number" ? err : 500));
		}
	});
}

export function terminate() {
    freeAll();
}