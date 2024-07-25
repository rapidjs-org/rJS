import { parentPort } from "worker_threads";

import { ISerialRequest, ISerialResponse } from "../interfaces";
import { AHandler } from "./AHandler";
import { GetHandler } from "./get/GetHandler";
import { PostHandler } from "./post/PostHandler";


process.on("uncaughtException", (err: unknown) => {
    const isStatusError: boolean = /^[2345]\d{2}$/.test(err.toString());

    !isStatusError && console.error(err);

    parentPort.postMessage({
        status: isStatusError ? err : 500
    });

    // TODO: Error control (no endless run on repeated dense errors)
});


parentPort.on("message", (sReq: ISerialRequest) => {
    let handler: AHandler;
    switch(sReq.method) {
        // TODO: HEAD
        case "GET":
            handler = new GetHandler(sReq);
            break;
        case "POST":
            handler = new PostHandler(sReq);
            break;
        default:
            throw 405;
    }

    handler.on("response", (sRes: ISerialResponse) => parentPort.postMessage(sRes));
    
    handler.process();
});