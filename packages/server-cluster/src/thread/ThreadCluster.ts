import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { join } from "path";
import { availableParallelism } from "os";

import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { Options } from "../.shared/Options";
import { WORKER_ERROR_CODE } from "../local.constants";
import {
    AWorkerCluster,
    IAdapterConfiguration,
    IClusterOptions
} from "../AWorkerCluster";

export class ThreadCluster extends AWorkerCluster<Thread> {
    constructor(
        adapterConfig: IAdapterConfiguration,
        options?: Partial<IClusterOptions>
    ) {
        super(
            join(__dirname, "api.thread"),
            adapterConfig,
            new Options<Partial<IClusterOptions>>(options, {
                baseSize: Math.min(
                    (options ?? {}).baseSize ?? Infinity,
                    availableParallelism() - 1
                )
            }).object
        );
    }

    protected createWorker(): Promise<Thread> {
        const thread = new Thread(this.workerModulePath, {
            argv: [],
            stdout: true,
            stderr: true,
            env: SHARE_ENV,
            workerData: this.adapterConfig
        });

        thread.on("error", (err: string) => {
            this.errorLimiter.feed(err);

            this.deactivateWorkerWithError(thread, 500);
        });
        thread.on("exit", (exitCode: number) => {
            if ([0, WORKER_ERROR_CODE].includes(exitCode)) return;

            this.deactivateWorkerWithError(thread, 500);

            this.spawnWorker();
        });

        return new Promise((resolve) => {
            thread.once("message", () => {
                resolve(thread);

                thread.on("message", (sRes: ISerialResponse) => {
                    ~~(sRes.status / 100) !== 5
                        ? this.deactivateWorker(thread, sRes)
                        : this.deactivateWorkerWithError(thread, sRes.status);
                });
            });
        });
    }

    protected destroyWorker(thread: Thread) {
        thread.terminate();
    }

    protected activateWorker(thread: Thread, serialRequest: ISerialRequest) {
        thread.postMessage(serialRequest);
    }
}
