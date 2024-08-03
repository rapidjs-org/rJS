import { Socket } from "net";
import { ChildProcess, fork } from "child_process";

import { IRequest } from "@rapidjs.org/rjs";

import { IWorkerPoolOptions, AWorkerPool } from "./.shared/AWorkerPool";


interface IProxyPackage {
	sReq: IRequest;
	socket: Socket;
}


export class ProcessPool extends AWorkerPool<ChildProcess, IProxyPackage, void, number> {
	private readonly instanceWorkingDirPath: string;

	constructor(childProcessModulePath: string, instanceWorkingDirPath: string, options?: IWorkerPoolOptions) {
		super(childProcessModulePath, options);

		this.instanceWorkingDirPath = instanceWorkingDirPath;
	}
	
	protected createWorker(): Promise<ChildProcess> {
    	const childProcess = fork(this.workerModulePath, {
			cwd: this.instanceWorkingDirPath,
			silent: true
    	});
		childProcess.stdout.on("data", (message: Buffer) => process.stdout.write(message.toString()));
		childProcess.stderr.on("data", (err: Buffer) => process.stderr.write(err.toString()));
		
    	return new Promise((resolve) => {
			childProcess
			.on("message", (message: string) => {
				switch(message) {
					case "online":
						resolve(childProcess);
						break;
					case "done":
						this.deactivateWorker(childProcess);
						break;
				}
			})
			.on("error", (err: Error) => {
				// TODO: Spin up new
				throw err;
			});
		});
	}
    
	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.kill();
	}

	protected activateWorker(childProcess: ChildProcess, proxyPackage: IProxyPackage) {
    	childProcess.send(proxyPackage.sReq, proxyPackage.socket);
	}

	protected onTimeout(childProcess: ChildProcess): void {
		this.deactivateWorkerWithError(childProcess, 408);
	}
}