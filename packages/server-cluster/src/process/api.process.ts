import _config from "../_config.json";

process.title = _config.processTitle;

import { ISerialRequest } from "../.shared/global.interfaces";
import { IAdapterConfiguration } from "../AWorkerCluster";
import { TAdapter, Adapter } from "../Adapter";

process.once("message", (workerData: IAdapterConfiguration) => {
    new Adapter(workerData.modulePath, workerData.options)
        .loadHandler()
        .then((handler: TAdapter) => {
            process.on("message", async (sReq: ISerialRequest) => {
                try {
                    process.send(await handler(sReq));
                } catch (err) {
                    process.send({
                        status: isNaN(err as number) ? 500 : (err as number)
                    });

                    if (isNaN(err as number)) throw err;
                }
            });

            process.send("online");
        });
});
