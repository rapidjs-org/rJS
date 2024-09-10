import { parentPort, workerData } from "worker_threads";

import { ISerialRequest } from "../.shared/global.interfaces";
import { TAdapter, Adapter } from "../Adapter";


new Adapter(workerData.modulePath, workerData.options)
.loadHandler()
.then(async (handler: TAdapter) => {
	parentPort.on("message", async (sReq: ISerialRequest) => {
		parentPort.postMessage(await handler(sReq));
	});
	
	parentPort.postMessage("online");
});