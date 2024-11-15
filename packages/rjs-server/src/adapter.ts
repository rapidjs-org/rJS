import { TJSON } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";

import { IHandlerEnv, Handler } from "@rapidjs.org/rjs-handler";

export default function (coreOptions: {
    env: IHandlerEnv;
    options: TJSON;
    deployPaths: string[];
}) {
    const handler: Handler = new Handler(
        coreOptions.env,
        coreOptions.options,
        coreOptions.deployPaths
    );
    // TODO: Await for preretrieval done if not dev mode

    return async (sReq: ISerialRequest): Promise<ISerialResponse> => {
        return await handler.activate(sReq);
    };
}
