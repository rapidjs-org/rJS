import { EventEmitter } from "events";
import { cpus } from "os";

import { TStatus } from "./.shared/global.types";
import { ISerialRequest, ISerialResponse } from "./.shared/global.interfaces";
import { Options } from "./.shared/Options";
import { Logger } from "./.shared/Logger";
import { WORKER_ERROR_CODE } from "./local.constants";
import { IErrorLimiterOptions, ErrorLimiter } from "./ErrorLimiter";


// errors approach
interface IWorker {
    resolve: (sRes: ISerialResponse) => void;
	reject: (sRes: ISerialResponse) => void;
}

interface IActiveWorker extends IWorker {
    timeout: NodeJS.Timeout;
}

interface IPendingAssignment<T> extends IWorker  {
    sReq: ISerialRequest;

	data?: T;
}


export interface IAdapterConfiguration {
	modulePath: string;

	options?: unknown;
}

export interface IClusterOptions {
	baseSize: number;
	timeout: number;
	maxPending: number;

	logsDirPath?: string;	// To: CWD
	silent?: boolean;
	errorLimiterOptions?: Partial<IErrorLimiterOptions>;
}

export abstract class AWorkerCluster<Worker extends EventEmitter, T = void> extends EventEmitter {
	private readonly activeWorkers: Map<Worker, IActiveWorker> = new Map();
	private readonly idleWorkers: Worker[] = [];
	private readonly pendingAssignments: IPendingAssignment<T>[] = [];
	private readonly options: IClusterOptions;
	private readonly logger: Logger;

	protected readonly errorLimiter: ErrorLimiter;
	protected readonly workerModulePath: string;
	protected readonly adapterConfig: IAdapterConfiguration;

	constructor(workerModulePath: string, adapterConfig: IAdapterConfiguration, options?: Partial<IClusterOptions>) {
		super();
		
		this.options = new Options<IClusterOptions>(options, {
			baseSize: Math.min(Math.max((options ?? {}).baseSize ?? Infinity, 1), cpus().length - 1),
			timeout: 30000,
			maxPending: Infinity,
			silent: false
		}).object;
		
		this.logger = new Logger(
			this.options.logsDirPath ? Logger.defaultPath(this.options.logsDirPath) : null,
			this.options.silent
		);	// TODO: Log intercept adapter out?
		
		this.errorLimiter = new ErrorLimiter(options.errorLimiterOptions)
		.on("feed", (err: Error) => {
			this.logger.error(err);
			
			this.emit("error", err);
		})
		.on("terminate", (onInit: boolean) => {
			this.logger.error(new Error(
				onInit
				? "Error in worker scope"
				: "Dense aggregate of errors in worker scope"
			));
			
			process.exit(WORKER_ERROR_CODE);
		});
		this.workerModulePath = workerModulePath;
		this.adapterConfig = adapterConfig;
		
		setImmediate(async () => {
			for(let i = 0; i < this.options.baseSize; i++) {
				await this.spawnWorker();
			}
			
			this.emit("online", this);
		});
	}

    protected abstract createWorker(): Worker|Promise<Worker>;
    protected abstract destroyWorker(worker: Worker): void;
    protected abstract activateWorker(worker: Worker, sReq: ISerialRequest, reqData?: T): void;

	private activate() {
    	if(!this.pendingAssignments.length
			|| !this.idleWorkers.length) return;
		
    	const worker: Worker = this.idleWorkers.shift()!;
    	const assignment: IPendingAssignment<T> = this.pendingAssignments.shift()!;
		
    	this.activateWorker(worker, assignment.sReq, assignment.data);
		
    	this.activeWorkers.set(worker, {
    		resolve: assignment.resolve,
    		reject: assignment.reject,
			
    		timeout: setTimeout(() => {
				this.deactivateWorkerWithError(worker, 408);
    		}, this.options.timeout)
    	});
	}

	protected getWorkerId(worker: Worker): number {
    	const optimisticWorkerCast = worker as unknown as {
            threadId: number;
            pid: number;
        };
        
    	return optimisticWorkerCast.threadId ?? optimisticWorkerCast.pid;
	}

	protected async spawnWorker(): Promise<Worker> {
		const worker: Worker = await this.createWorker();

		(worker as Worker & { stdout: EventEmitter; })
		.stdout.on("data", (message: string) => this.logger.info(message));
		(worker as Worker & { stderr: EventEmitter; })
		.stderr.on("data", (message: string) => this.logger.error(message));

		this.idleWorkers.push(worker);
		
		return worker;
	}

	protected deactivateWorker(worker: Worker, sRes?: ISerialResponse) {
    	const activeWorker: IActiveWorker = this.activeWorkers.get(worker)!;

    	if(!activeWorker) return;

    	clearTimeout(activeWorker.timeout);
		
    	activeWorker.resolve({
			status: 200,
			headers: {},
			
			...sRes
		});

    	this.idleWorkers.push(worker);

    	this.activeWorkers.delete(worker);
		
		this.activate();
	}

	protected deactivateWorkerWithError(worker: Worker, err?: TStatus) {
    	const activeWorker: IActiveWorker = this.activeWorkers.get(worker)!;

    	if(!activeWorker) return;

		activeWorker.resolve({
			status: isNaN(err) ? err : 500,
			headers: {},
		});

    	this.deactivateWorker(worker);
	}

	public handleRequest(sReq: ISerialRequest, data?: T): Promise<ISerialResponse> {
    	return new Promise((resolve, reject) => {
    		if(this.pendingAssignments.length >= (this.options.maxPending ?? Infinity)) {
    			reject();
				
    			return;
    		}

    		this.pendingAssignments
    		.push({
				sReq, data,
				resolve, reject
			});
            
    		this.activate();
    	});
	}
	
	public destroy() {
    	Array.from(this.activeWorkers.keys())
    	.concat(this.idleWorkers)
    	.forEach((worker: Worker) => {
    		this.destroyWorker(worker);
    	});
	}

	// TODO: Elastic size
}