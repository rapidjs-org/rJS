import { ChildProcess, fork } from "child_process";
import { Socket } from "net";
import { join } from "path";

import { ISerialRequest, ISerialResponse } from "../.shared/global.interfaces";
import { WORKER_ERROR_CODE } from "../local.constants";
import { AWorkerCluster, IAdapterConfiguration, IClusterOptions } from "../AWorkerCluster";


export class ProcessCluster extends AWorkerCluster<ChildProcess, Socket> {
	constructor(adapterConfig: IAdapterConfiguration, options?: Partial<IClusterOptions>) {
		super(join(__dirname, "api.process"), adapterConfig, options);
		
		process.on("exit", () => this.destroy());
		[
			"SIGINT", "SIGUSR1", "SIGUSR2",
			"SIGTERM"
		].forEach((terminalEvent: string) => {
			process.on(terminalEvent, () => process.exit());
		});
	}

	protected createWorker(): Promise<ChildProcess> {
		const childProcess = fork(this.workerModulePath, {
			detached: false,
			silent: true
    	})
		.on("exit", (exitCode: number) => {
			(exitCode === WORKER_ERROR_CODE)
			&& process.exit(WORKER_ERROR_CODE);

			if(exitCode === 0) return;

			this.deactivateWorkerWithError(childProcess, 500);
			
			this.spawnWorker();
		});
		
		childProcess.send(this.adapterConfig);
		
    	return new Promise((resolve, reject) => {
			childProcess
			.once("message", () => {
				resolve(childProcess);
				
				childProcess.on("message", (sRes: ISerialResponse) => {
					this.deactivateWorker(childProcess, sRes);
				});
			})
			.on("error", (err: Error) => {
				this.errorLimiter.feed(err);

				reject(err);
			});
		});
	}

	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.kill();
	}

	protected activateWorker(childProcess: ChildProcess, sReq: ISerialRequest, socket: Socket) {
		childProcess.send(sReq, socket);
	}
}