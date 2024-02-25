import { cpus } from "os";
import { Socket } from "net";
import { ChildProcess, fork } from "child_process";

import { AWorkerPool } from "../common/AWorkerPool";
import { IHTTPMessage } from "../interfaces";
import { Args } from "../common/Args";


export interface IClientPackage {
	socket: Socket;
	message: IHTTPMessage;
}


/**
 * Class representing a concrete server process worker pool
 * build around forked and traced child processes.
 */
export class ProcessPool extends AWorkerPool<ChildProcess, IClientPackage, void> {
	private readonly childProcessModulePath: string;
	private readonly cwd: string;
	private readonly args: string[];

	constructor(childProcessModulePath: string, cwd: string, args: string[], baseSize?: number, timeout?: number, maxPending?: number) {
		super(baseSize || (new Args(args).parseOption("max-cores").number || cpus().length), timeout, maxPending);
		
    	this.childProcessModulePath = childProcessModulePath;
    	this.cwd = cwd;
    	this.args = args;
	}
    
	/**
     * Create a worker process as required by the abstract parent
     * class. Forks the process incarnating the designated child
     * module.
     * @returns Child process handle
     */
	protected createWorker(): Promise<ChildProcess> {        
    	const childProcess = fork(this.childProcessModulePath, this.args, {
			cwd: this.cwd,
			silent: true
    		// TODO: APP RELATED! optional arg override?
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
						this.deactivateWorker(childProcess, null);
						break;
				}
			})
			.on("error", (err: Error) => {
				// TODO: Spin up new
				throw err;
			});
		});
	}
    
	/**
     * Destroy a worker process as required by the abstract parent
     * class. Terminates the process registered as a worker.
     * @param childProcess Child process handle
     */
	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.send("terminate");
		
    	childProcess.kill();
	}

	/**
     * Activate a worker as required by the abstract parent class.
     * Sends the input data encoding request and socket related
     * child data to the candidate process.
     * @param childProcess Candidate child process
     * @param childData Child data package
     */
	protected activateWorker(childProcess: ChildProcess, clientPackage: IClientPackage) {
    	childProcess.send(clientPackage.message, clientPackage.socket);
	}
}