import { Worker as Thread, SHARE_ENV } from "worker_threads";
import { join } from "path";

import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { Logger } from "../.shared/Logger";
import { AWorkerPool, IAdapterOptions, IWorkerPoolOptions } from "../AWorkerPool";
import { WORKER_ERROR_CODE } from "../local.constants";


export class ThreadPool extends AWorkerPool<Thread, ISerialRequest, ISerialResponse, number> {
	constructor(adapterOptions: IAdapterOptions, options: IWorkerPoolOptions = {}) {
		super(join(__dirname, "./api.thread"), adapterOptions, options);
	}
	
	protected createWorker(): Promise<Thread> {
    	const thread = new Thread(this.workerModulePath, {
    		argv: [],
    		env: SHARE_ENV,
			workerData: {
				adapterModulePath: this.adapterOptions.modulePath,
				applicationOptions: this.adapterOptions.options
			}
    	});

		thread.on("error", (err: string) => {
			this.logError(err);
			
			this.errorLimiter.feed();
		});
		thread.on("exit", (exitCode: number) => {
			if([ 0, WORKER_ERROR_CODE ].includes(exitCode)) return;
			
			this.spawnWorker();
		});
		
    	return new Promise((resolve) => {
    		thread.once("message", () => {
				resolve(thread);
				
				thread.on("message", (sRes: ISerialResponse) => {
					(~~(sRes.status / 100) !== 5)
					? this.deactivateWorker(thread, sRes)
					: this.deactivateWorkerWithError(thread, sRes.status); 
				});
			});
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