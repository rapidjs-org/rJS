import { parentPort, workerData } from "worker_threads";

import * as rJS_core from "@rapidjs.org/core";

import { TStatus } from "@common/types";

import * as utils from "../utils";
import { APP_CONFIG } from "./APP_CONFIG";


const REQUEST_LIMITS = {
    bodyLength: APP_CONFIG.get<number>("maxRequestBodyLength"),
    urlLength: APP_CONFIG.get<number>("maxRequestURLLength"),
    headersLength: APP_CONFIG.get<number>("maxRequestHeadersLength"),
};

const requestHandler: rJS_core.RequestHandler = new rJS_core.RequestHandler({
    devMode: false,
    workingDir: workerData.workingDir
});


process.on("uncaughtException", (potentialStatus: TStatus|unknown) => {
	parentPort.postMessage(utils.serialResponseFromPotentialStatus(potentialStatus));
});


parentPort.on("message", (serialRequest: rJS_core.ISerialRequest) => {
	if(serialRequest.url.length > REQUEST_LIMITS.urlLength) {
		throw 414;
	}
	if(Object.entries(serialRequest.headers).flat().join("").length > REQUEST_LIMITS.headersLength) {
		throw 432;
	}
	if((serialRequest.body ?? "").toString().length > REQUEST_LIMITS.bodyLength) {
		throw 413;
	}

    requestHandler
    .handle(serialRequest)
    .then((serialResponse: rJS_core.ISerialResponse) => parentPort.postMessage(serialResponse));
});