import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { IAdapterConfiguration, IClusterOptions } from "../AWorkerCluster";
import { ThreadCluster } from "../thread/ThreadCluster";

export default async function (options: {
    threadAdapterConfig: IAdapterConfiguration;
    threadClusterOptions: IClusterOptions;
}) {
    return new Promise((resolve) => {
        const threadCluster: ThreadCluster = new ThreadCluster(
            options.threadAdapterConfig,
            options.threadClusterOptions
        )
            .once("online", () => {
                resolve(
                    async (sReq: ISerialRequest): Promise<ISerialResponse> => {
                        return await threadCluster.handleRequest(sReq);
                    }
                );
            })
            .on("error", (err: unknown) => {
                throw err;
            })
            .on("stdout", (message: string) => process.stdout.write(message))
            .on("stderr", (message: string) => process.stderr.write(message));
    });
}
