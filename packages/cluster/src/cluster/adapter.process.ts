import { IAdapterConfiguration, IClusterOptions } from "../AWorkerPool";
import { ThreadPool } from "../thread/ThreadPool";

export default async function (options: {
    threadAdapterConfig: IAdapterConfiguration;
    threadClusterOptions: IClusterOptions;
}) {
    return new Promise((resolve) => {
        const threadCluster: ThreadPool = new ThreadPool(
            options.threadAdapterConfig,
            options.threadClusterOptions
        )
            .once("online", () => {
                resolve(async (data: unknown): Promise<unknown> => {
                    return await threadCluster.assign(data);
                });
            })
            .on("error", (err: unknown) => {
                throw err;
            })
            .on("stdout", (message: string) => process.stdout.write(message))
            .on("stderr", (message: string) => process.stderr.write(message));
    });
}
