import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { AWorkerPool } from "../common/AWorkerPool";


/**
 * Class representing a concrete server process worker pool
 * build around forked and traced child processes.
 */
export class ProcessPool extends AWorkerPool<Socket, void> {
	private readonly childProcessModulePath: string;

	constructor(childProcessModulePath: string, baseSize?: number, timeout?: number, maxPending?: number) {
    	super(baseSize, timeout, maxPending);

    	this.childProcessModulePath = childProcessModulePath;
	}
    
	/**
     * Create a worker process as required by the abstract parent
     * class. Forks the process incarnating the designated child
     * module.
     * @returns Child process handle
     */
	protected createWorker(): ChildProcess {        
    	const childProcess = fork(this.childProcessModulePath, process.argv.slice(2), {
			cwd: process.cwd(),
			silent: true
    		// TODO: APP RELATED! optional arg override?
    	});
		childProcess.stdout.on("data", (message: Buffer) => process.stdout.write(message.toString()));
		childProcess.stderr.on("data", (err: Buffer) => process.stderr.write(err.toString()));

    	childProcess.on("message", (message: string) => {
    		if(message !== "done") return;
    		
    		this.deactivateWorker(childProcess, null);
    	});
    	/* childProcess.on("error", (err: Error) => {
			// TODO: Spin up new
			throw err;
		}); */
        
    	return childProcess;
	}
    
	/**
     * Destroy a worker process as required by the abstract parent
     * class. Terminates the process registered as a worker.
     * @param childProcess Child process handle
     */
	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.send("terminate");	// TODO: Fix
		
    	childProcess.kill();
	}

	/**
     * Activate a worker as required by the abstract parent class.
     * Sends the input data encoding request and socket related
     * child data to the candidate process.
     * @param childProcess Candidate child process
     * @param childData Child data package
     */
	protected activateWorker(childProcess: ChildProcess, socket: Socket) {
    	childProcess.send("socket", socket);
	}

}