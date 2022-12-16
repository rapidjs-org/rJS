import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { IIntermediateRequest, ISpaceEnv } from "../interfaces";
import { WorkerPool } from "../WorkerPool";
import * as print from "../print";


interface IChildData {
    iReq: IIntermediateRequest;
    socket: Socket;
}


export class ChildProcessPool extends WorkerPool<IChildData, void> {

    private readonly childProcessModulePath: string;
    private readonly env: ISpaceEnv;

    constructor(childProcessModulePath: string, env: ISpaceEnv, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);
        
        this.childProcessModulePath = childProcessModulePath;
        this.env = env;
    }
    
    protected createWorker(): ChildProcess {
        const childProcess = fork(this.childProcessModulePath, {
            cwd: process.cwd(), // TODO: Set according to project
            detached: false,
            silent: true,
            env: {
                MODE: JSON.stringify(this.env.MODE),
                PATH: this.env.PATH
            }
        });

		childProcess.stdout.on("data", (message: Buffer) => {
			print.info(String(message).replace(/\n$/, ""));
		});
		childProcess.stderr.on("data", (err: Buffer) => {
			print.error(String(err));
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