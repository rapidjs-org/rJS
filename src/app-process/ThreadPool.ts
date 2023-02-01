import { Worker as Thread, SHARE_ENV } from "worker_threads";

import { IRequest, IResponse } from "../_interfaces";
import { WorkerPool } from "../WorkerPool";


export class ThreadPool extends WorkerPool<IRequest, IResponse> {

    private readonly threadModulePath: string;

    constructor(threadModulePath: string, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        this.threadModulePath = threadModulePath;
    }

    protected createWorker(): Promise<Thread> {
        const thread = new Thread(this.threadModulePath, {
            argv: process.argv.slice(2),
            env: SHARE_ENV,
            workerData: {
                
            }    // TODO: How to utilize?
        });

        return new Promise((resolve) => {
            thread.once("message", () => {
                thread.on("message", (sRes: IResponse) => {
                    this.deactivateWorker(thread, sRes); 
                });

                resolve(thread);
            });
            //thread.on("error", err => reject(err));
        });
    }

    protected activateWorker(thread: Thread, sReq: IRequest) {
        thread.postMessage(sReq);
    }

}