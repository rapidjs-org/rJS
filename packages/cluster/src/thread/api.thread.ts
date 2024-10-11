import { parentPort, workerData } from "worker_threads";

import { TAtomicSerializable } from "../.shared/global.types";
import { TAdapter, Adapter } from "../Adapter";

new Adapter<unknown, unknown>(
    (workerData as { modulePath: string }).modulePath,
    (workerData as { options: unknown }).options
)
    .loadHandler()
    .then((handler: TAdapter<TAtomicSerializable, TAtomicSerializable>) => {
        parentPort.on("message", async (data: TAtomicSerializable) => {
            parentPort.postMessage(await handler(data));
        });

        parentPort.postMessage("online");
    });
