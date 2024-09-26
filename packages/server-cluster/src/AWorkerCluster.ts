import { EventEmitter } from "events";
import { cpus } from "os";

import { TStatus } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { Options } from "./.shared/Options";
import { WORKER_ERROR_CODE } from "./local.constants";
import { IErrorLimiterOptions, ErrorLimiter } from "./ErrorLimiter";

// errors approach
interface IWorker {
    resolve: (sRes: ISerialResponse) => void;
    reject: (sRes: ISerialResponse) => void;
}

interface IActiveWorker extends IWorker {
    timeout: NodeJS.Timeout;
}

interface IPendingAssignment extends IWorker {
    sReq: ISerialRequest;
}

export interface IAdapterConfiguration {
    modulePath: string;

    options?: unknown;
}

export interface IClusterOptions {
    baseSize: number;
    timeout: number;
    maxPending: number;

    errorLimiterOptions?: Partial<IErrorLimiterOptions>;
}

// TODO: Elastic size
export abstract class AWorkerCluster<
    Worker extends EventEmitter
> extends EventEmitter {
    private readonly activeWorkers: Map<Worker, IActiveWorker> = new Map();
    private readonly idleWorkers: Worker[] = [];
    private readonly pendingAssignments: IPendingAssignment[] = [];
    private readonly options: IClusterOptions;

    protected readonly errorLimiter: ErrorLimiter;
    protected readonly workerModulePath: string;
    protected readonly adapterConfig: IAdapterConfiguration;

    constructor(
        workerModulePath: string,
        adapterConfig: IAdapterConfiguration,
        options?: Partial<IClusterOptions>
    ) {
        super();

        this.options = new Options<IClusterOptions>(options, {
            baseSize: Math.min(
                Math.max((options ?? {}).baseSize ?? Infinity, 1),
                cpus().length - 1
            ),
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
            for (let i = 0; i < this.options.baseSize; i++) {
                await this.spawnWorker();
            }

            this.emit("online", this);
        });
    }

    protected abstract createWorker(): Worker | Promise<Worker>;
    protected abstract destroyWorker(worker: Worker): void;
    protected abstract activateWorker(
        worker: Worker,
        sReq: ISerialRequest
    ): void;

    private activate() {
        if (!this.pendingAssignments.length || !this.idleWorkers.length) return;

        const worker: Worker = this.idleWorkers.shift();
        const assignment: IPendingAssignment = this.pendingAssignments.shift();

        this.activateWorker(worker, assignment.sReq);

        this.activeWorkers.set(worker, {
            resolve: assignment.resolve,
            reject: assignment.reject,

            timeout: setTimeout(() => {
                this.deactivateWorkerWithError(worker, 408);
            }, this.options.timeout)
        });
    }

    protected getWorkerId(worker: Worker): number {
        const optimisticWorkerCast = worker as unknown as {
            threadId: number;
            pid: number;
        };

        return optimisticWorkerCast.threadId ?? optimisticWorkerCast.pid;
    }

    protected async spawnWorker(): Promise<Worker> {
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

    protected deactivateWorker(worker: Worker, sRes?: ISerialResponse) {
        const activeWorker: IActiveWorker = this.activeWorkers.get(worker);

        if (!activeWorker) return;

        clearTimeout(activeWorker.timeout);

        if ((sRes ?? {}).body) {
            sRes.body =
                sRes.body instanceof Uint8Array
                    ? (() => {
                          const buffer: Buffer = Buffer.alloc(
                              sRes.body.byteLength
                          );
                          for (let i = 0; i < buffer.length; ++i) {
                              buffer[i] = sRes.body[i];
                          }
                          return buffer;
                      })()
                    : Object.keys(sRes.body).sort().join(",") == "data,type"
                      ? (() => {
                            const buffer = Buffer.alloc(
                                (sRes.body as unknown as { data: number[] })
                                    .data.length
                            );
                            for (let i = 0; i < buffer.length; ++i) {
                                buffer[i] = (
                                    sRes.body as unknown as { data: number[] }
                                ).data[i];
                            }
                            return buffer;
                        })()
                      : sRes.body;
        }

        activeWorker.resolve({
            status: 200,
            headers: {},

            ...sRes
        });

        this.idleWorkers.push(worker);

        this.activeWorkers.delete(worker);

        this.activate();
    }

    protected deactivateWorkerWithError(worker: Worker, err?: TStatus) {
        const activeWorker: IActiveWorker = this.activeWorkers.get(worker);

        if (!activeWorker) return;

        activeWorker.resolve({
            status: isNaN(err) ? err : 500,
            headers: {}
        });

        this.deactivateWorker(worker);
    }

    public destroy() {
        Array.from(this.activeWorkers.keys())
            .concat(this.idleWorkers)
            .forEach((worker: Worker) => {
                this.destroyWorker(worker);
            });
    }

    // TODO: IncomingMessage object overload?
    public handleRequest(sReq: ISerialRequest): Promise<ISerialResponse> {
        return new Promise((resolve, reject) => {
            if (
                this.pendingAssignments.length >=
                (this.options.maxPending ?? Infinity)
            ) {
                reject();

                return;
            }

            this.pendingAssignments.push({
                sReq,
                resolve,
                reject
            });

            this.activate();
        });
    }
}
