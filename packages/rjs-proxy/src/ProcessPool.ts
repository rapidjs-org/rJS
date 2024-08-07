import { ChildProcess, fork } from "child_process";

import { IWorkerPoolOptions, AWorkerPool } from "./.shared/AWorkerPool";
import { Logs } from "./.shared/Logs";
import { TerminationHandler } from "./TerminationHandler";


export class ProcessPool<I, O> extends AWorkerPool<ChildProcess, I, O, number> {
	private readonly processWorkingDirPath: string;
	private readonly env: { [ key: string ]: string };

	constructor(childProcessModulePath: string, processWorkingDirPath: string, env: { [ key: string ]: string; } = {}, options?: IWorkerPoolOptions) {
		super(childProcessModulePath, {
			...options,
			...env.DEV ? { baseSize: 1 } : {}
		});
		
		this.processWorkingDirPath = processWorkingDirPath;
		this.env = env;

		new TerminationHandler(() => this.clear());
	}
	
	protected createWorker(): Promise<ChildProcess> {
    	const childProcess = fork(this.workerModulePath, {
			cwd: this.processWorkingDirPath,
			detached: false,
			env: this.env
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
				reject(err);
				
				Logs.global.error(err);
			})
			.on("exit", (exitCode: number) => {
				if(exitCode === 0) return;

				this.spawnWorker();
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