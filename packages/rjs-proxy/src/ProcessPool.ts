import { ChildProcess, fork } from "child_process";

import { IWorkerPoolOptions, AWorkerPool } from "./.shared/AWorkerPool";
import { TerminationHandler } from "./TerminationHandler";


export class ProcessPool<I, O> extends AWorkerPool<ChildProcess, I, O, number> {
	private readonly instanceWorkingDirPath: string;

	constructor(childProcessModulePath: string, instanceWorkingDirPath: string, options?: IWorkerPoolOptions) {
		super(childProcessModulePath, options);
		
		this.instanceWorkingDirPath = instanceWorkingDirPath;

		new TerminationHandler(() => this.clear());
	}
	
	protected createWorker(): Promise<ChildProcess> {
    	const childProcess = fork(this.workerModulePath, {
			cwd: this.instanceWorkingDirPath,
			detached: false
    	});
		
    	return new Promise((resolve, reject) => {
			childProcess
			.once("message", () => {
				resolve(childProcess);

				childProcess.on("message", (dataOut: O) => {
					this.deactivateWorker(childProcess, dataOut);
				});
			})
			.on("error", (err: Error) => {
				reject();

				console.error(err);

				// TODO: Spin up new

				throw err;
			});
		});
	}
    
	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.kill();
	}

	protected activateWorker(childProcess: ChildProcess, dataIn: I) {
		childProcess.send(dataIn as Record<string, unknown>);
	}

	protected onTimeout(childProcess: ChildProcess): void {
		this.deactivateWorkerWithError(childProcess, 408);
	}
}