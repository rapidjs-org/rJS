import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { IBasicRequest } from "../_interfaces";
import * as print from "../print";

import { AWorkerPool } from "./AWorkerPool";
import { EmbedContext } from "./EmbedContext";
import { ErrorControl } from "./ErrorControl";


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


new ErrorControl();


/**
 * Class representing a concrete server process worker pool
 * build around forked and traced child processes.
 */
export class ProcessPool extends AWorkerPool<IChildData, void> {

    //private readonly logDir: string;
    private readonly childProcessModulePath: string;
    private readonly embedContext: EmbedContext;

    private terminatedError: string;
    
    constructor(childProcessModulePath: string, embedContext: EmbedContext, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        /* const logDirPath: string = "";  //parseOption("logs", "L").string; // TODO: Project local if given as flag?
        if(logDirPath) {
            this.logDir = join(PATH, logDirPath);

            if(!existsSync(this.logDir)) {
                // TODO: Error; but no termination of proxy process ()
                try {
                    mkdirSync(this.logDir, {
                        recursive: true
                    });
                } catch {
                    throw new RangeError(`Log directory does not exist nor can be created automatically '${this.logDir}'`);
                }
            }
        } */
        
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
			print.info(String(message).replace(/\n$/, "")/* , this.logDir */);
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
            // Write error message to termination reference
            this.terminatedError = String(err);

            this.clear();

            print.error(this.terminatedError);
            
            this.emit("terminate");
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
    }

    /**
     * Retrieve the error message the cluyter has terminated with.
     * Implicit to checking whether the cluster has terminated
     * handling requests.
     * @returns Error message or null if still running
     */
    public retrieveTerminatedError(): string {
        return this.terminatedError;
    }

}