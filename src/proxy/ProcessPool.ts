import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { IBasicRequest } from "../_interfaces";
import { AsyncMutex } from "../AsyncMutex";
import * as print from "../print";

import { WorkerPool } from "./AWorkerPool";


interface IChildData {
    iReq: IBasicRequest;
    socket: Socket;
}


const contextMutex: AsyncMutex = new AsyncMutex();


export class ProcessPool extends WorkerPool<IChildData, void> {

    private readonly logDir: string;
    private readonly childProcessModulePath: string;
    
    private embedContext: typeof import("./EmbedContext");
    
    constructor(childProcessModulePath: string, args: string[], baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        process.argv = process.argv.slice(0, 2).concat(args);

        contextMutex.lock(async () => {
            this.embedContext = await import("./EmbedContext");
        });

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
        
        // TODO: logDir to ENV?

        this.associatedEmbed = associatedEmbed;
        this.childProcessModulePath = childProcessModulePath;
    }
    
    protected createWorker(): ChildProcess {        
        const childProcess = fork(this.childProcessModulePath, this.associatedEmbed.ARGS, {
            cwd: this.associatedEmbed.PATH, // TODO: Log toggle option only? (log to project root /logs?)
            env: {
                MODE: this.associatedEmbed.MODE,
                SHELL: this.associatedEmbed.SHELL
            },
            detached: false,
            silent: true
        });
        
		childProcess.stdout.on("data", (message: Buffer) => {
			print.info(String(message).replace(/\n$/, ""), this.logDir);
		});
		childProcess.stderr.on("data", (err: Buffer) => {
			print.error(String(err), this.logDir);
		});
        
        childProcess.on("message", (message: string) => {
            if(message !== "done") {
                return;
            }

            this.deactivateWorker(childProcess, null);
        });
        
        return childProcess;
    }
    
    protected activateWorker(childProcess: ChildProcess, childData: IChildData) {
        childProcess.send(childData.iReq, childData.socket);
    }

}