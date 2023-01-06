import { ChildProcess, fork } from "child_process";
import { Socket } from "net";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

import { IIntermediateRequest, ISpaceEnv } from "../interfaces";
import { WorkerPool } from "../WorkerPool";
import { parseOption } from "../args";

import { PATH } from "./PATH";
import { MODE } from "./MODE";
import * as print from "./print";


interface IChildData {
    iReq: IIntermediateRequest;
    socket: Socket;
}


export class ChildProcessPool extends WorkerPool<IChildData, void> {

    private readonly childProcessModulePath: string;
    private readonly env: ISpaceEnv;
    private readonly logDir: string;

    constructor(childProcessModulePath: string, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        const logDirPath: string = parseOption("status", "S").string;
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
        }
        
        // TODO: logDir to ENV?

        this.childProcessModulePath = childProcessModulePath;
        this.env = {
            PATH, MODE
        };
    }
    
    protected createWorker(): ChildProcess {        
        const childProcess = fork(this.childProcessModulePath, {
            cwd: process.cwd(), // TODO: Set according to project
            detached: false,
            silent: true,
            env: {
                MODE: JSON.stringify(this.env.MODE),
                PATH: this.env.PATH     // TODO: How to handkle uniformously?
            }
        });

		childProcess.stdout.on("data", (message: Buffer) => {
			print.info(String(message).replace(/\n$/, ""), this.logDir);
		});
		childProcess.stderr.on("data", (err: Buffer) => {
			print.error(String(err), this.logDir);   // TODO: Provide with log file dir from ENV
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