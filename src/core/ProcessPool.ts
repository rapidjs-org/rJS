import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { IBasicRequest } from "../interfaces";

import { AWorkerPool } from "./AWorkerPool";
import { EmbedContext } from "../EmbedContext";


/**
 * Interface encoding child as fed to the worker processes.
 * Includes a basic representation containing only relevant
 * information of the request as well as the socket reference
 * for internal socker closure.
 */
interface IChildData {
    iReq: IBasicRequest;
    socket: Socket;
}


/**
 * Class representing a concrete server process worker pool
 * build around forked and traced child processes.
 */
export class ProcessPool extends AWorkerPool<IChildData, void> {

    //private readonly logDir: string;
    private readonly childProcessModulePath: string;
    private readonly embedContext: EmbedContext;

    constructor(childProcessModulePath: string, embedContext: EmbedContext = EmbedContext.global, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        this.embedContext = embedContext;
        this.childProcessModulePath = childProcessModulePath;
    }
    
    /**
     * Create a worker process as required by the abstract parent
     * class. Forks the process incarnating the designated child
     * module.
     * @returns Child process handle
     */
    protected createWorker(): ChildProcess {        
        const childProcess = fork(this.childProcessModulePath, this.embedContext.args, {
            cwd: process.cwd(),
            detached: false,
            silent: true
        });
        
		childProcess.stdout.on("data", (message: Buffer) => {
            this.emit("stdout", String(message));
		});
        /*
         * Any error occurring within processes is locally intercepted.
         * Hence, any error bubbling up is due to explicit pass through
         * behavior motivated by error control instances.
         * 
         * Terminate any running clustered sub-process and 
         * it handled with downwards-inherent cluster termination.
         */
		childProcess.stderr.on("data", (err: Buffer) => {
            this.emit("stderr", String(err));

            this.deactivateWorker(childProcess, null);
		});
        
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
    protected activateWorker(childProcess: ChildProcess, childData: IChildData) {
        childProcess.send(childData.iReq, childData.socket);

        //childProcess.on("error", err => console.error(err));
    }

    public emit(eventName: "stdout"|"stderr", message: string): boolean {
        return super.emit(eventName, message);
    }

}