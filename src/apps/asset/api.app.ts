import { TConcreteAppAPI } from "../../_types";
import { IRequest, IResponse } from "../../_interfaces";

import { RequestHandler } from "./RequestHandler";





export default function(api: TConcreteAppAPI) {
    console.log(api);
    
    /*
     * Request handler interface.
     */
    return (sReq: IRequest): IResponse => {
        const reqHandler = new RequestHandler(sReq.ip, sReq.method, sReq.url, sReq.headers, sReq.body, sReq.encoding, sReq.cookies, sReq.locale);
        
        return new api.Response(reqHandler.message, reqHandler.status, reqHandler.headers, reqHandler.cookies);
    };
}