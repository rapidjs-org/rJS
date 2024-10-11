import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { join } from "path";
import { availableParallelism } from "os";

import { Options } from "../.shared/Options";
import { WORKER_ERROR_CODE } from "../local.constants";
import {
    AWorkerPool,
    EClusterError,
    IAdapterConfiguration,
    IClusterOptions
} from "../AWorkerPool";

export class ThreadPool<I = unknown, O = unknown> extends AWorkerPool<
    Thread,
    I,
    O
> {
    constructor(
        adapterConfig: IAdapterConfiguration,
        options?: Partial<IClusterOptions>
    ) {
        super(
            join(__dirname, "api.thread"),
            adapterConfig,
            new Options<Partial<IClusterOptions>>(options, {
                limit: Math.min(
                    (options ?? {}).limit ?? Infinity,
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

        thread.on("error", (errMessage: Error) => {
            this.errorLimiter.feed(errMessage);

            this.deactivateWorkerWithError(thread, errMessage);
        });
        thread.on("exit", (exitCode: number) => {
            if ([0, WORKER_ERROR_CODE].includes(exitCode)) return;

            this.deactivateWorkerWithError(thread, EClusterError.WORKER_EXIT);

            this.respawnWorker();
        });

        return new Promise((resolve) => {
            thread.once("message", () => {
                resolve(thread);

                thread.on("message", (dataOut: O) => {
                    this.deactivateWorker(thread, dataOut);
                });
            });
        });
    }

    protected getWorkerId(worker: Thread): number {
        return worker.threadId;
    }

    protected destroyWorker(thread: Thread) {
        thread.terminate();
    }

    protected activateWorker(thread: Thread, dataIn: I) {
        thread.postMessage(dataIn);
    }
}
