import * as CoreAPI from "../../core/api/api.core";
import { IRequest } from "../../interfaces";


import { RequestHandler } from "./RequestHandler";


import defaultConfig from "./default.config.json";


CoreAPI.config.mergeDefault(defaultConfig);


/*
 * Request handler interface.
 */
export default async function(sReq: IRequest): Promise<CoreAPI.Response> {
	return new Promise((resolve, reject) => {
		new RequestHandler(sReq.ip, sReq.method, sReq.url, sReq.body, sReq.headers, sReq.cookies, sReq.locale, (reqHandler: RequestHandler) => {
			resolve(new CoreAPI.Response(reqHandler.message, reqHandler.status, reqHandler.headers, reqHandler.cookies));
		});
	});
}