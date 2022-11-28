import { Worker as Thread, SHARE_ENV } from "worker_threads";

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
            env: SHARE_ENV,
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