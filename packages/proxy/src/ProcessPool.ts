/* import { Socket } from "net";
import { ChildProcess, fork } from "child_process";



export interface IClientPackage {
	socket: Socket;
	message: IHTTPMessage;
}


export class ProcessPool extends AWorkerPool<ChildProcess, IClientPackage, void> {
	private readonly childProcessModulePath: string;
	private readonly cwd: string;
	private readonly args: string[];

	constructor(childProcessModulePath: string, cwd: string, args: string[], baseSize?: number, timeout?: number, maxPending?: number) {
		super(baseSize || (new Args(args).parseOption("max-cores").number), timeout, maxPending);
		
    	this.childProcessModulePath = childProcessModulePath;
    	this.cwd = cwd;
    	this.args = args;
	}
    
	protected createWorker(): Promise<ChildProcess> {        
    	const childProcess = fork(this.childProcessModulePath, this.args, {
			cwd: this.cwd,
			silent: true
    		// TODO: APP RELATED! optional arg override?
    	});
		childProcess.stdout.on("data", (message: Buffer) => process.stdout.write(message.toString()));
		childProcess.stderr.on("data", (err: Buffer) => process.stderr.write(err.toString()));
		
    	return new Promise((resolve) => {
			childProcess
			.on("message", (message: string) => {
				switch(message) {
				case "online":
					resolve(childProcess);
					break;
				case "done":
					this.deactivateWorker(childProcess);
					break;
				}
			})
			.on("error", (err: Error) => {
				// TODO: Spin up new
				throw err;
			});
		});
	}
    
	protected destroyWorker(childProcess: ChildProcess) {
    	childProcess.send("terminate");
		
    	childProcess.kill();
	}

	protected activateWorker(childProcess: ChildProcess, clientPackage: IClientPackage) {
    	childProcess.send(clientPackage.message, clientPackage.socket);
	}
} */