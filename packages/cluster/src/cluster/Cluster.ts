import { ChildProcess } from "child_process";
import { Worker as Thread } from "worker_threads";
import { join } from "path";

import {
    IAdapterConfiguration,
    IClusterOptions,
    AWorkerPool
} from "../AWorkerPool";
import { ProcessPool } from "../process/ProcessPool";
import { ThreadPool } from "../thread/ThreadPool";

export class Cluster<I = unknown, O = unknown> {
    private readonly parentPool: AWorkerPool<ChildProcess | Thread, I, O>;

    constructor(
        adapterConfig: IAdapterConfiguration,
        processClusterOptions?: Partial<IClusterOptions>,
        threadClusterOptions: Partial<IClusterOptions> = processClusterOptions
    ) {
        this.parentPool =
            processClusterOptions.limit !== 1
                ? new ProcessPool(
                      {
                          modulePath: join(__dirname, "adapter.process"),
                          options: {
                              threadAdapterConfig: adapterConfig,
                              threadClusterOptions: threadClusterOptions
                          }
                      },
                      processClusterOptions
                  )
                : new ThreadPool(adapterConfig, threadClusterOptions);
    }

    public assign(data: I): Promise<O> {
        return this.parentPool.assign(data);
    }

    public on(event: string, handler: (...args: unknown[]) => void): this {
        this.parentPool.on(event, handler);

        return this;
    }

    public once(event: string, handler: (...args: unknown[]) => void): this {
        this.parentPool.once(event, handler);

        return this;
    }

    public destroy() {
        return this.parentPool.destroy();
    }
}
