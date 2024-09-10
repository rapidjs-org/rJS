import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { IAdapterConfiguration, IClusterOptions } from "../AWorkerCluster";
import { ThreadCluster } from "../thread/ThreadCluster";


export default async function(options: {
    threadAdapterConfig: IAdapterConfiguration;
    threadClusterOptions: IClusterOptions;
}) {
	return new Promise((resolve) => {
		const threadCluster: ThreadCluster = new ThreadCluster(options.threadAdapterConfig, options.threadClusterOptions)
        .once("online", () => {
        	resolve((sReq: ISerialRequest): Promise<ISerialResponse> => {
        		return threadCluster.handleRequest(sReq);
        	});
        })
        .on("error", (err: Error|unknown) => {
        	throw err;
        });
	});
};