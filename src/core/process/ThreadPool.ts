import { Worker as Thread, SHARE_ENV } from "worker_threads";

import { IRequest, IResponse } from "../_interfaces";

import { AWorkerPool } from "../proxy/AWorkerPool";


/**
 * Class representing a concrete server thread worker pool
 * build around instanciated and traced worker threads.
 */
export class ThreadPool extends AWorkerPool<IRequest, IResponse> {

    private readonly threadModulePath: string;

    constructor(threadModulePath: string, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        this.threadModulePath = threadModulePath;
    }

    /**
     * Create a worker thread as required by the abstract parent
     * class. Instanciated a thread worker executing the designated
     * thread module.
     * @returns Thread handle
     */
    protected createWorker(): Promise<Thread> {
        const thread = new Thread(this.threadModulePath, {
            argv: process.argv.slice(2),
            env: SHARE_ENV,
            workerData: {
                
            }    // TODO: How to utilize?
        });

        return new Promise((resolve) => {
            /*
             * Any error occurring within threads is locally intercepted.
             * Hence, any error bubbling up is due to explicit pass
             * through behavior motivated by error control instances.
             * 
             * Pass through error to parent process at this level to have
             * it handled with downwards-inherent cluster termination.
             */
            thread.on("error", err => {
                throw err;
            });

            thread.once("message", () => {
                thread.on("message", (sRes: IResponse) => {
                    this.deactivateWorker(thread, sRes); 
                });

                resolve(thread);
            });
        });
    }
    
    /**
     * Destroy a worker thread as required by the abstract parent
     * class. Terminates the thread registered as a worker.
     * @param thread Thread handle
     */
    protected destroyWorker(thread: Thread) {
        thread.terminate();
    }

    /**
     * Activate a worker as required by the abstract parent class.
     * Sends the input data encoding request and socket related
     * child data to the candidate thread.
     * @param thread Candidate thread
     * @param sReq Serial request
     */
    protected activateWorker(thread: Thread, sReq: IRequest) {
        thread.postMessage(sReq);
    }

}