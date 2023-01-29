import { ChildProcess, fork } from "child_process";
import { Socket } from "net";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

import { IEmbed, IBareRequest } from "../_interfaces";
import { WorkerPool } from "../WorkerPool";
import * as print from "../print";


interface IChildData {
    iReq: IBareRequest;
    socket: Socket;
}


export class ProcessPool extends WorkerPool<IChildData, void> {

    private readonly logDir: string;
    private readonly childProcessModulePath: string;
    private readonly associatedEmbed: IEmbed;

    constructor(childProcessModulePath: string, associatedEmbed: IEmbed, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        const logDirPath: string = "";  //parseOption("logs", "L").string; // TODO: Project local if given as flag?
        if(logDirPath) {
            this.logDir = join(associatedEmbed.PATH, logDirPath);

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
        }
        
        // TODO: logDir to ENV?

        this.associatedEmbed = associatedEmbed;
        this.childProcessModulePath = childProcessModulePath;
    }
    
    protected createWorker(): ChildProcess {        
        const childProcess = fork(this.childProcessModulePath, this.associatedEmbed.ARGS, {
            cwd: this.associatedEmbed.PATH,
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