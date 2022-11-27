import { ChildProcess, fork } from "child_process";
import { Socket } from "net";

import { IRequest } from "../interfaces";
import { WorkerPool } from "../WorkerPool";


type TSocketHandle = [ IRequest, Socket ];


export class ChildProcessPool extends WorkerPool<TSocketHandle, void> {

    private readonly childProcessModulePath: string;

    constructor(childProcessModulePath: string, baseSize?: number, timeout?: number, maxPending?: number) { // TODO: Define
        super(baseSize, timeout, maxPending);

        this.childProcessModulePath = childProcessModulePath;
    }

    protected createWorker(): ChildProcess {
        const childProcess = fork(this.childProcessModulePath, {
            cwd: process.cwd(), // TODO: Set according to project
            detached: false,
            silent: true
        });

		childProcess.stdout.on("data", (message: Buffer) => {
			process.stdout.write(String(message));
		});
		childProcess.stderr.on("data", (err: Buffer) => {
			process.stderr.write(String(err));
		});

        childProcess.on("message", (message: string) => {
            if(message !== "done") {
                return;
            }

            this.deactivateWorker(childProcess, null);
        });
        
        return childProcess;
    }

    protected activateWorker(childProcess: ChildProcess, socketHandle: TSocketHandle) {
        childProcess.send(socketHandle[0], socketHandle[1]);
    }

}