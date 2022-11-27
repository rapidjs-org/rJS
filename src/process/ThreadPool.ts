import { Worker as Thread } from "worker_threads";

import { IRequest, IResponse } from "../interfaces";
import { WorkerPool } from "../WorkerPool";


export class ThreadPool extends WorkerPool<IRequest, IResponse> {

    private readonly threadModulePath: string;

    constructor(threadModulePath: string, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        this.threadModulePath = threadModulePath;
    }

    protected createWorker(): Thread {
        const thread = new Thread(this.threadModulePath, {
            argv: process.argv.slice(2).concat(process.argv[1]),    // TODO: What to pass?
            workerData: null    // TODO: How to utilize?
        });

        thread.on("message", (sRes: IResponse) => {
            this.deactivateWorker(thread, sRes); 
        });
        
        return thread;
    }

    protected activateWorker(thread: Thread, sReq: IRequest) {
        thread.postMessage(sReq);
    }

}