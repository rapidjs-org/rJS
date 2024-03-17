import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { AWorkerPool } from "@rapidjs.org/shared";
/**
 * Class representing a concrete server thread worker pool
 * build around instanciated and traced worker threads.
 */
export class ThreadPool extends AWorkerPool {
    constructor(threadModulePath, baseSize, timeout, maxPending) {
        super(baseSize, timeout, maxPending);
        this.threadModulePath = threadModulePath;
    }
    /**
     * Create a worker thread as required by the abstract parent
     * class. Instanciated a thread worker executing the designated
     * thread module.
     * @returns Thread handle
     */
    createWorker() {
        const thread = new Thread(this.threadModulePath, {
            argv: process.argv.slice(2),
            env: SHARE_ENV
        });
        thread.on("message", (sRes) => {
            this.deactivateWorker(thread, sRes);
        });
        /* thread.on("error", (err: Error) => {
            // TODO: Spin up new
            throw err;
        }); */
        return new Promise((resolve) => {
            thread.once("online", () => resolve(thread));
        });
    }
    /**
     * Destroy a worker thread as required by the abstract parent
     * class. Terminates the thread registered as a worker.
     * @param thread Thread handle
     */
    destroyWorker(thread) {
        thread.terminate();
    }
    /**
     * Activate a worker as required by the abstract parent class.
     * Sends the input data encoding request and socket related
     * child data to the candidate thread.
     * @param thread Candidate thread
     * @param sReq Serial request
     */
    activateWorker(thread, sReq) {
        thread.postMessage(sReq);
    }
}
