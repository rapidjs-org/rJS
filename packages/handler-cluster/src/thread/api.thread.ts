import { parentPort, workerData } from "worker_threads";

import { ISerialRequest } from "../.shared/global.interfaces";
import { TAdapter, Adapter } from "../Adapter";

new Adapter(
    (workerData as { modulePath: string }).modulePath,
    (workerData as { options: unknown }).options
)
    .loadHandler()
    .then((handler: TAdapter) => {
        parentPort.on("message", async (sReq: ISerialRequest) => {
            parentPort.postMessage(await handler(sReq));
        });

        parentPort.postMessage("online");
    });
