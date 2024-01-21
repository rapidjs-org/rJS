import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { AWorkerPool } from "../common/AWorkerPool";


/**
 * Class representing a concrete server process worker pool
 * build around forked and traced child processes.
 */
export class ProcessPool extends AWorkerPool<Socket, void> {

    //private readonly logDir: string;
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
    	const childProcess = fork(this.childProcessModulePath, /* this.embedContext.args */[], {
    		cwd: process.cwd(), // TODO: APP RELATED! optional arg override?
    		detached: false,
    		silent: true
    	});
        
    	childProcess.stdout.on("data", (message: Buffer) => {
    		this.emit("stdout", String(message));
    	});
    	
    	/* childProcess.stderr.on("data", (err: Buffer) => {
    		this.emit("stderr", String(err));

    		this.deactivateWorker(childProcess, null);
    	}); */
        
    	childProcess.on("message", (message: string) => {
    		if(message !== "done") {
    			return;
    		}

    		this.deactivateWorker(childProcess, null);
    	});
        
    	return childProcess;
    }
    
    /**
     * Destroy a worker process as required by the abstract parent
     * class. Terminates the process registered as a worker.
     * @param childProcess Child process handle
     */
    protected destroyWorker(childProcess: ChildProcess) {
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
    	childProcess.send(socket);

    	//childProcess.on("error", err => console.error(err));
    }

    public emit(eventName: "stdout"|"stderr", message: string): boolean {
    	return super.emit(eventName, message);
    }

}