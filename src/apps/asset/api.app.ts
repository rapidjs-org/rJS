import { API, define as defineAPI } from "./api.core";
import { RequestHandler } from "./RequestHandler";

import * as TConcreteAppAPIT from "../../../types/core/thread/api.concrete";

export default function(apiObj: TConcreteAppAPI) {
    defineAPI(apiObj);
    
    /*
     * Request handler interface.
     */
    return (sReq: IRequest): IResponse => {
        const reqHandler = new RequestHandler(sReq.ip, sReq.method, sReq.url, sReq.headers, sReq.body, sReq.encoding, sReq.cookies, sReq.locale);
        
        return new API.Response(reqHandler.message, reqHandler.status, reqHandler.headers, reqHandler.cookies);
    };
}