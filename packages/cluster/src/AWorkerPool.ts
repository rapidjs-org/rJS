import { EventEmitter } from "events";

import { Options } from "./.shared/Options";
import { WORKER_ERROR_CODE } from "./local.constants";
import { IErrorLimiterOptions, ErrorLimiter } from "./ErrorLimiter";

interface IWorker<O> {
    resolve: (dataOut: O) => void;
    reject: (dataOut: O | EClusterError | Error) => void;
}

interface IActiveWorker<O> extends IWorker<O> {
    timeout: NodeJS.Timeout;
}

interface IPendingAssignment<I, O> extends IWorker<O> {
    dataIn: I;
}

export interface IAdapterConfiguration {
    modulePath: string;

    options?: unknown;
}

export interface IClusterOptions {
    limit: number;
    timeout: number;
    maxPending: number;

    errorLimiterOptions?: Partial<IErrorLimiterOptions>;
}

export enum EClusterError {
    TIMEOUT,
    MAX_PENDING,
    WORKER_EXIT
}

export abstract class AWorkerPool<
    Worker extends EventEmitter,
    I,
    O
> extends EventEmitter {
    private readonly activeWorkers: Map<Worker, IActiveWorker<O>> = new Map();
    private readonly idleWorkers: Worker[] = [];
    private readonly pendingAssignments: IPendingAssignment<I, O>[] = [];
    private readonly options: IClusterOptions;

    protected readonly errorLimiter: ErrorLimiter;
    protected readonly workerModulePath: string;
    protected readonly adapterConfig: IAdapterConfiguration;

    private aliveWorkers: number = 0;

    protected destroyed: boolean = false;

    constructor(
        workerModulePath: string,
        adapterConfig: IAdapterConfiguration,
        options?: Partial<IClusterOptions>
    ) {
        super();

        this.options = new Options<IClusterOptions>(options, {
            limit: Math.max((options ?? {}).limit || Infinity, 1),
            timeout: 30000,
            maxPending: Infinity
        }).object;

        this.errorLimiter = new ErrorLimiter(options.errorLimiterOptions)
            .on("feed", (err: Error) => {
                this.emit("error", err);
            })
            .on("terminate", () => {
                process.exit(WORKER_ERROR_CODE);
            });
        this.workerModulePath = workerModulePath;
        this.adapterConfig = adapterConfig;

        setImmediate(async () => {
            await this.spawnWorker();

            this.emit("online", this);
        });
    }

    protected abstract createWorker(): Worker | Promise<Worker>;
    protected abstract getWorkerId(worker: Worker): number;
    protected abstract destroyWorker(worker: Worker): void;
    protected abstract activateWorker(worker: Worker, data: I): void;

    private async activate() {
        if (!this.pendingAssignments.length) return;
        if (!this.idleWorkers.length) {
            this.aliveWorkers < this.options.limit &&
                (await this.spawnWorker()); // TODO: Shut down workers if idle for a while? (elasticity)

            return;
        }

        const worker: Worker = this.idleWorkers.shift();
        const assignment: IPendingAssignment<I, O> =
            this.pendingAssignments.shift();

        this.activateWorker(worker, assignment.dataIn);

        this.activeWorkers.set(worker, {
            resolve: assignment.resolve,
            reject: assignment.reject,

            timeout: setTimeout(() => {
                this.deactivateWorkerWithError(worker, EClusterError.TIMEOUT);
            }, this.options.timeout)
        });
    }

    private deactivate(worker: Worker, activeWorker: IActiveWorker<O>) {
        clearTimeout(activeWorker.timeout);

        this.idleWorkers.push(worker);

        this.activeWorkers.delete(worker);

        this.activate();
    }

    private async spawnWorker(): Promise<Worker> {
        this.aliveWorkers++;

        const worker: Worker = await this.createWorker();

        (worker as Worker & { stdout: EventEmitter }).stdout.on(
            "data",
            (message: unknown) => this.emit("stdout", message)
        );
        (worker as Worker & { stderr: EventEmitter }).stderr.on(
            "data",
            (message: unknown) => this.emit("stderr", message)
        );

        this.idleWorkers.push(worker);

        return worker;
    }

    private rebufferData<T>(data: T): T {
        if (!data || ["string", "number", "boolean"].includes(typeof data))
            return data;

        const buffersData = data as { [key: string]: unknown };
        for (const key in buffersData) {
            if (buffersData[key] instanceof Uint8Array) {
                buffersData[key] = (() => {
                    const buffer: Buffer = Buffer.alloc(
                        buffersData[key].byteLength
                    );
                    for (let i = 0; i < buffer.length; ++i) {
                        buffer[i] = buffersData[key][i];
                    }
                    return buffer;
                })();

                continue;
            }
            if (Object.keys(buffersData[key]).sort().join(",") == "data,type") {
                buffersData[key] = (() => {
                    const buffer = Buffer.alloc(
                        (buffersData[key] as { data: number[] }).data.length
                    );
                    for (let i = 0; i < buffer.length; ++i) {
                        buffer[i] = (
                            buffersData[key] as { data: number[] }
                        ).data[i];
                    }
                    return buffer;
                })();

                continue;
            }

            buffersData[key] = this.rebufferData(buffersData[key]);
        }

        return buffersData as T;
    }

    protected async respawnWorker(): Promise<Worker> {
        this.aliveWorkers--;

        return this.spawnWorker();
    }

    protected deactivateWorker(worker: Worker, dataOut?: O) {
        const activeWorker: IActiveWorker<O> = this.activeWorkers.get(worker);
        if (!activeWorker) return;

        dataOut = this.rebufferData(dataOut);

        activeWorker.resolve(dataOut);

        this.deactivate(worker, activeWorker);
    }

    protected deactivateWorkerWithError(
        worker: Worker,
        errOut?: EClusterError | Error
    ) {
        const activeWorker: IActiveWorker<O> = this.activeWorkers.get(worker);
        if (!activeWorker) return;

        activeWorker.reject(errOut);

        this.deactivate(worker, activeWorker);
    }

    public destroy() {
        this.destroyed = true;

        Array.from(this.activeWorkers.keys())
            .concat(this.idleWorkers)
            .forEach((worker: Worker) => {
                this.destroyWorker(worker);
            });
    }

    public assign(dataIn: I): Promise<O> {
        return new Promise((resolve, reject) => {
            if (this.pendingAssignments.length >= this.options.maxPending) {
                reject(EClusterError.MAX_PENDING);

                return;
            }

            this.pendingAssignments.push({
                dataIn,
                resolve,
                reject
            });

            this.activate();
        });
    }
}
