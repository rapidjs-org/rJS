import { parentPort } from "worker_threads";

import { ISerialRequest, ISerialResponse } from "../interfaces";
import { AHandler } from "./AHandler";
import { GetHandler } from "./get/GetHandler";
import { PostHandler } from "./post/PostHandler";


parentPort.on("message", (sReq: ISerialRequest) => {
	let handler: AHandler;
	switch (sReq.method) {
		case "GET":
		case "HEAD":
			handler = new GetHandler(sReq);
			break;
		case "POST":
			handler = new PostHandler(sReq);
			break;
		default:
			throw 405;
	}

	handler.once("response", (sRes: ISerialResponse) => {
		if (sReq.method === "HEAD") {
			delete sReq.body;
		}

		parentPort.postMessage(sRes);
	});

	try {
		handler.process();
	} catch (err: unknown) {
		const isStatusError: boolean = /^[2345]\d{2}$/.test((err as string).toString());

		handler.emit("response", {
			status: isStatusError ? err : 500
		});

		!isStatusError && console.error(err);

		// TODO: Error control (no endless run on repeated dense errors)
	}
});
