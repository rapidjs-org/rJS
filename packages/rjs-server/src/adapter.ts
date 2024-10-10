import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

import { IHandlerOptions, Handler } from "@rapidjs.org/rjs-handler";

export default function (coreOptions: IHandlerOptions) {
    const handler: Handler = new Handler(coreOptions); // TODO: Await for preretrieval done if not dev mode

    return async (sReq: ISerialRequest): Promise<ISerialResponse> => {
        return await handler.activate(sReq);
    };
}
