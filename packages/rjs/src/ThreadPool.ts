import { Worker as Thread, SHARE_ENV } from "worker_threads";

import { IWorkerPoolOptions, WorkerPool } from "./WorkerPool";

import rJS_core from "@rapidjs.org/core";


interface IThreadOptions {
	workingDir?: string;
	devMode?: boolean;
}

interface IThreadPoolOptions extends IWorkerPoolOptions {
	threadOptions: IThreadOptions;
};


export class ThreadPool extends WorkerPool<Thread, rJS_core.ISerialRequest, rJS_core.ISerialResponse, number> {
	private readonly threadOptions: IThreadOptions;

	constructor(threadModulePath: string, options: IThreadPoolOptions) {
		super(threadModulePath, options);

		this.threadOptions = options.threadOptions ?? {};
	}
	
	protected createWorker(): Promise<Thread> {
    	const thread = new Thread(this.workerModulePath, {
    		argv: process.argv.slice(2),
    		env: SHARE_ENV,
			workerData: this.threadOptions
    	});
		
		thread.on("message", (serialResponse: rJS_core.ISerialResponse) => {
			this.deactivateWorker(thread, serialResponse); 
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

	protected activateWorker(thread: Thread, serialRequest: rJS_core.ISerialRequest) {
    	thread.postMessage(serialRequest);
	}

	protected onTimeout(worker: Thread): void {
		this.deactivateWorkerWithError(worker, 408);
	}
}