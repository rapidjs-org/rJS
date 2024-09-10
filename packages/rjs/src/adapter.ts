import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

import { ICoreOptions, Core } from "@rapidjs.org/rjs-core";


export default function(coreOptions: ICoreOptions) {
    const coreInstance: Core = new Core(coreOptions);
    
    return async (sReq: ISerialRequest): Promise<ISerialResponse> => {
        return await coreInstance.handleRequest(sReq);
    };
};