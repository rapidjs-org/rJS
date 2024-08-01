import { Worker as Thread, SHARE_ENV } from "worker_threads";

import { ISerialRequest, ISerialResponse } from "./interfaces";
import { IWorkerPoolOptions, AWorkerPool } from "./.shared/AWorkerPool";


export class ThreadPool extends AWorkerPool<Thread, ISerialRequest, ISerialResponse, number> {
	constructor(threadModulePath: string, options?: IWorkerPoolOptions) {
		super(threadModulePath, options);
	}
	
	protected createWorker(): Promise<Thread> {
    	const thread = new Thread(this.workerModulePath, {
    		argv: [],
    		env: SHARE_ENV,
			workerData: null
    	});
		
		thread.on("message", (sRes: ISerialResponse) => {
			const isServerError: boolean = ~~(sRes.status / 100) === 5;
			!isServerError
				? this.deactivateWorker(thread, sRes)
				: this.deactivateWorkerWithError(thread, sRes.status); 
		});
		/* thread.on("error", (potentialStatus: number|unknown) => {
			// TODO: Spin up new
		}); */
        
    	return new Promise((resolve) => {
    		thread.once("online", () => resolve(thread));
    	});
	}
    
	protected destroyWorker(thread: Thread) {
    	thread.terminate();
	}

	protected activateWorker(thread: Thread, serialRequest: ISerialRequest) {
    	thread.postMessage(serialRequest);
	}

	protected onTimeout(worker: Thread): void {
		this.deactivateWorkerWithError(worker, 408);
	}
}