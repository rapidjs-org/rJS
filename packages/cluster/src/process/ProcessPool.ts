import { ChildProcess, fork } from "child_process";
import { join } from "path";
import { cpus } from "os";

import { TSerializable } from "../.shared/global.types";
import { Options } from "../.shared/Options";
import { WORKER_ERROR_CODE } from "../local.constants";
import {
    AWorkerPool,
    EClusterError,
    IAdapterConfiguration,
    IClusterOptions
} from "../AWorkerPool";

export class ProcessPool<I = unknown, O = unknown> extends AWorkerPool<
    ChildProcess,
    I,
    O
> {
    constructor(
        adapterConfig: IAdapterConfiguration,
        options?: Partial<IClusterOptions>
    ) {
        super(
            join(__dirname, "api.process"),
            adapterConfig,
            new Options<Partial<IClusterOptions>>(options, {
                limit: Math.min(
                    (options ?? {}).limit ?? Infinity,
                    cpus().length - 1
                )
            }).object
        );

        process.on("exit", () => this.destroy());
        ["SIGKILL", "SIGINT", "SIGUSR1", "SIGUSR2", "SIGTERM"].forEach(
            (terminalEvent: string) => {
                process.on(terminalEvent, () => process.exit());
            }
        );
    }

    protected createWorker(): Promise<ChildProcess> {
        const childProcess = fork(this.workerModulePath, {
            detached: false,
            silent: true
        }).on("exit", (exitCode: number) => {
            exitCode === WORKER_ERROR_CODE && process.exit(WORKER_ERROR_CODE);

            if (exitCode === 0) return;

            this.deactivateWorkerWithError(
                childProcess,
                EClusterError.WORKER_EXIT
            );

            this.respawnWorker();
        });

        childProcess.send(this.adapterConfig);

        return new Promise((resolve, reject) => {
            childProcess
                .once("message", () => {
                    resolve(childProcess);

                    childProcess.on("message", (dataOut: O) => {
                        this.deactivateWorker(childProcess, dataOut);
                    });
                })
                .on("error", (err: Error) => {
                    this.errorLimiter.feed(err);

                    reject(err);
                });
        });
    }

    protected getWorkerId(worker: ChildProcess): number {
        return worker.pid;
    }

    protected destroyWorker(childProcess: ChildProcess) {
        childProcess.kill();
    }

    protected activateWorker(childProcess: ChildProcess, dataIn: I) {
        childProcess.send(dataIn as TSerializable);
    }
}
