process.title = "rJS cluster process";

import { IAdapterConfiguration } from "../AWorkerPool";
import { TAdapter, Adapter } from "../Adapter";

process.once("message", (workerData: IAdapterConfiguration) => {
    new Adapter(workerData.modulePath, workerData.options)
        .loadHandler()
        .then((handler: TAdapter) => {
            process.on("message", async (dataIn: unknown) => {
                process.send(await handler(dataIn));
            });

            process.send("online");
        });
});
