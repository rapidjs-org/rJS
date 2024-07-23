import { IncomingMessage, ServerResponse, createServer as httpCreateServer } from "http";

import * as rJS_core from "@rapidjs.org/core";

import { TJSON, TStatus } from "@common/types";

import * as utils from "./utils";
import { RequestHandler } from "./RequestHandler";
import { CallDeferral } from "./CallDeferral";


export function createServer(options: TJSON): Promise<void> {
	const optionsWithDefaults: TJSON = {
		port: 80,

		...options
	};

	const callDeferral: CallDeferral = new CallDeferral(2);
	const requestHandler: RequestHandler = new RequestHandler(options, () => callDeferral.call());
    
	return new Promise((resolve) => {
		// TODO: HTTPS
		httpCreateServer(async (request: IncomingMessage, response: ServerResponse) => {
			requestHandler
            .handle(await rJS_core.RequestHandler.parseSerialRequest(request))
            .then((serialResponse: rJS_core.ISerialResponse) => {
            	rJS_core.RequestHandler
                .applySerialResponse(serialResponse, response);
            })
            .catch((potentialStatus: TStatus|unknown) => {
            	console.error(potentialStatus); // TODO

            	rJS_core.RequestHandler
                .applySerialResponse(utils.serialResponseFromPotentialStatus(potentialStatus), response);
            });
		})
        .listen(optionsWithDefaults.port, () => callDeferral.call(resolve));
	});
}