import * as CoreAPI from "../../core/api/api.core";
import { IRequest } from "../../interfaces";

import { RequestHandler } from "./RequestHandler";


/*
 * Request handler interface.
 */
export default function(sReq: IRequest): CoreAPI.Response {
    const reqHandler = new RequestHandler(sReq.ip, sReq.method, sReq.url, sReq.body, sReq.headers, sReq.encoding, sReq.cookies, sReq.locale);
    
    return new CoreAPI.Response(reqHandler.message, reqHandler.status, reqHandler.headers, reqHandler.cookies);
}