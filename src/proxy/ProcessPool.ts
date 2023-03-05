import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { IBasicRequest } from "../_interfaces";
import * as print from "../print";

import { AWorkerPool } from "./AWorkerPool";
import { EmbedContext } from "./EmbedContext";


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
            cwd: this.embedContext.path,
            detached: false,
            silent: true
        });
        
		childProcess.stdout.on("data", (message: Buffer) => {
			print.info(String(message).replace(/\n$/, "")/* , this.logDir */);
		});
		childProcess.stderr.on("data", (err: Buffer) => {
			print.error(String(err)/* , this.logDir */);
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
     * Activate a worker as required by the abstract parent class.
     * Sends the input data encoding request and socket related
     * child data to the candidate process.
     * @param childProcess Candidate child process
     * @param childData Child data package
     */
    protected activateWorker(childProcess: ChildProcess, childData: IChildData) {
        childProcess.send(childData.iReq, childData.socket);
    }

}