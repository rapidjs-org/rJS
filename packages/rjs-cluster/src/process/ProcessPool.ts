import { ChildProcess, fork } from "child_process";
import { Socket } from "net";
import { join } from "path";

import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { TerminationHandler } from "../.shared/TerminationHandler";
import { AWorkerPool, IAdapterOptions, IWorkerPoolOptions } from "../AWorkerPool";
import { WORKER_ERROR_CODE } from "../local.constants";


interface IProcessData {
	sReq: ISerialRequest;

	socket?: Socket;
}

export class ProcessPool extends AWorkerPool<ChildProcess, IProcessData, ISerialResponse, number> {
	constructor(adapterOptions: IAdapterOptions, options: IWorkerPoolOptions = {}) {
		super(join(__dirname, "./api.process"), adapterOptions, options);
		
		new TerminationHandler(() => this.destroy());
	}

	protected createWorker(): Promise<ChildProcess> {
		const childProcess = fork(this.workerModulePath, {
			detached: false
    	})
		.on("exit", (exitCode: number) => {
			(exitCode === WORKER_ERROR_CODE)
			&& process.exit(WORKER_ERROR_CODE);

			if(exitCode === 0) return;

			this.logError(exitCode);
			
			this.errorLimiter.feed();
			
			this.spawnWorker();
		});

		childProcess.send({
			adapterOptions: this.adapterOptions,
			workerPoolOptions: this.options
		});

    	return new Promise((resolve, reject) => {
			childProcess
			.once("message", () => {
				resolve(childProcess);
				
				childProcess.on("message", (sRes: ISerialResponse) => {
					this.deactivateWorker(childProcess, sRes);
				});
			})
			.on("error", (err: Error) => {
				this.logError(err);
				
				this.errorLimiter.feed();
				
				reject(err);
			});
		});
	}
	
	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.kill();
	}

	protected activateWorker(childProcess: ChildProcess, processData: IProcessData) {
		childProcess.send(processData.sReq, processData.socket);
	}

	protected onTimeout(childProcess: ChildProcess): void {
		this.deactivateWorkerWithError(childProcess, 408);
	}
}