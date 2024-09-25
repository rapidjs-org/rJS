import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

import { IHandlerOptions, Handler } from "@rapidjs.org/rjs-handler";


export default function(coreOptions: IHandlerOptions) {
    const handler: Handler = new Handler(coreOptions);
    
    return async (sReq: ISerialRequest): Promise<ISerialResponse> => {
        return await handler.activate(sReq);
    };
};