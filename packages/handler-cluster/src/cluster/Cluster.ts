import { ChildProcess } from "child_process";
import { Worker as Thread } from "worker_threads";
import { join } from "path";

import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import {
    IAdapterConfiguration,
    IClusterOptions,
    AWorkerCluster
} from "../AWorkerCluster";
import { ProcessCluster } from "../process/ProcessCluster";
import { ThreadCluster } from "../thread/ThreadCluster";

export class Cluster {
    private readonly parentCluster: AWorkerCluster<ChildProcess | Thread>;

    constructor(
        adapterConfig: IAdapterConfiguration,
        processClusterOptions?: Partial<IClusterOptions>,
        threadClusterOptions: Partial<IClusterOptions> = processClusterOptions
    ) {
        this.parentCluster =
            processClusterOptions.limit !== 1
                ? new ProcessCluster(
                      {
                          modulePath: join(__dirname, "adapter"),
                          options: {
                              threadAdapterConfig: adapterConfig,
                              threadClusterOptions: threadClusterOptions
                          }
                      },
                      processClusterOptions
                  )
                : new ThreadCluster(adapterConfig, threadClusterOptions);
    }

    public handleRequest(sReq: ISerialRequest): Promise<ISerialResponse> {
        return this.parentCluster.handleRequest(sReq);
    }

    public on(event: string, handler: (...args: unknown[]) => void): this {
        this.parentCluster.on(event, handler);

        return this;
    }

    public once(event: string, handler: (...args: unknown[]) => void): this {
        this.parentCluster.once(event, handler);

        return this;
    }

    public destroy() {
        return this.parentCluster.destroy();
    }
}
