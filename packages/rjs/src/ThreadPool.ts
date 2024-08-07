import { Worker as Thread, SHARE_ENV } from "worker_threads";

import { IWorkerPoolOptions, AWorkerPool } from "./.shared/AWorkerPool";
import { Logs } from "./.shared/Logs";
import { ISerialRequest, ISerialResponse } from "./interfaces";


export class ThreadPool extends AWorkerPool<Thread, ISerialRequest, ISerialResponse, number> {
	private readonly threadWorkingDirPath: string;

	constructor(threadModulePath: string, threadWorkingDirPath: string, options?: IWorkerPoolOptions) {
		super(threadModulePath, options);

		this.threadWorkingDirPath = threadWorkingDirPath;
	}
	
	protected createWorker(): Promise<Thread> {
    	const thread = new Thread(this.workerModulePath, {
    		argv: [],
    		env: SHARE_ENV,
			workerData: {
				workingDirPath: this.threadWorkingDirPath
			}
    	});
		
		thread.on("message", (sRes: ISerialResponse) => {
			const isServerError: boolean = ~~(sRes.status / 100) === 5;
			!isServerError
				? this.deactivateWorker(thread, sRes)
				: this.deactivateWorkerWithError(thread, sRes.status); 
		});
		thread.on("error", (err: string) => {
			Logs.global.error(err);
		});
		thread.on("exit", (exitCode: number) => {
			if(exitCode === 0) return;
			
			this.spawnWorker();
		});

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