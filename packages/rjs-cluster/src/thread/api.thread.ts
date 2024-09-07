import { parentPort, workerData } from "worker_threads";

import { ISerialRequest } from "../.shared/global.interfaces";
import { TAdapter, TAdapterModule } from "../local.types";


import(workerData.adapterModulePath)
.then((adapterModule: TAdapterModule) => {
	const requestHandlerAdapter: TAdapter = adapterModule.default(workerData.applicationOptions);

	parentPort.on("message", async (sReq: ISerialRequest) => {
		parentPort.postMessage(await requestHandlerAdapter(sReq));
	});
	
	parentPort.postMessage("online");
});