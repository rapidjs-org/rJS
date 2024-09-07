import { EventEmitter } from "events";
import { cpus } from "os";

import { ErrorLimiter } from "./ErrorLimiter";
import { WORKER_ERROR_CODE } from "./local.constants";
import { Options } from "./.shared/Options";
import { Logger } from "./.shared/Logger";


interface IWorker<O, E> {
    resolve: (dataOut: O) => void;
	reject: (err?: E) => void;
}

interface IActiveWorker<O, E> extends IWorker<O, E> {
    timeout: NodeJS.Timeout;
}

interface IPendingAssignment<I, O, E> extends IWorker<O, E>  {
    dataIn: I;
}


export interface IAdapterOptions {
	modulePath: string;

	options?: unknown;
}

export interface IWorkerPoolOptions {
	logsDirPath?: string;
	baseSize?: number;
	timeout?: number;
	maxPending?: number;
}

export abstract class AWorkerPool<Worker extends EventEmitter, I, O, E> extends EventEmitter {
	private readonly activeWorkers: Map<Worker, IActiveWorker<O, E>> = new Map();
	private readonly idleWorkers: Worker[] = [];
	private readonly pendingAssignments: IPendingAssignment<I, O, E>[] = [];
	private readonly logger: Logger|null;
	
	protected readonly options: IWorkerPoolOptions;
	protected readonly errorLimiter: ErrorLimiter;
	protected readonly workerModulePath: string;
	protected readonly adapterOptions: IAdapterOptions;
	
	constructor(workerModulePath: string, adapterOptions: IAdapterOptions, options: IWorkerPoolOptions = {}) {
		super();
		
		this.options = new Options(options, {
			baseSize: Math.min(Math.max(options.baseSize ?? Infinity, 1), cpus().length - 1),
			timeout: 30000,
			maxPending: Infinity
		}).object;
		
		this.logger = this.options.logsDirPath
		? new Logger(Logger.defaultPath(this.options.logsDirPath))
		: null;
		
		this.errorLimiter = new ErrorLimiter((onInit: boolean) => {
			console.error(new Error(
				onInit
				? "Error in worker scope"
				: "Dense aggregate of errors in worker scope"
			));
			
			process.exit(WORKER_ERROR_CODE);
		});
		this.workerModulePath = workerModulePath;
		this.adapterOptions = adapterOptions;

		setImmediate(async () => {
			for(let i = 0; i < this.options.baseSize; i++) {
				await this.spawnWorker();
			}
			
			this.emit("online");
		});
	}

    protected abstract createWorker(): Worker|Promise<Worker>;
    protected abstract destroyWorker(worker: Worker): void;
    protected abstract activateWorker(worker: Worker, dataIn: I): void;
	protected abstract onTimeout(worker: Worker): void;

	private activate() {
    	if(!this.pendingAssignments.length
		|| !this.idleWorkers.length) return;
		
    	const worker: Worker = this.idleWorkers.shift()!;
    	const assignment: IPendingAssignment<I, O, E> = this.pendingAssignments.shift()!;
		
    	this.activateWorker(worker, assignment.dataIn);
		
    	this.activeWorkers.set(worker, {
    		resolve: assignment.resolve,
    		reject: assignment.reject,

    		timeout: setTimeout(() => {
				this.onTimeout(worker);
    		}, this.options.timeout)
    	});
	}

	protected logError(err: Error|unknown) {
		if(!this.logger) return;

		this.logger.error(err as Error);
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
		
		this.idleWorkers.push(worker);
		
		return worker;
	}

	protected deactivateWorker(worker: Worker, dataOut?: O) {
    	const activeWorker: IActiveWorker<O, E> = this.activeWorkers.get(worker)!;

    	if(!activeWorker) return;

    	clearTimeout(activeWorker.timeout);

    	dataOut
		&& activeWorker.resolve(dataOut);

    	this.idleWorkers.push(worker);
        
    	this.activeWorkers.delete(worker);
	}

	protected deactivateWorkerWithError(worker: Worker, err?: E) {
    	const activeWorker: IActiveWorker<O, E> = this.activeWorkers.get(worker)!;

    	if(!activeWorker) return;

		activeWorker.reject(err);

    	this.deactivateWorker(worker);
	}

	public assign(dataIn: I): Promise<O> {
    	return new Promise((resolve, reject) => {
    		if(this.pendingAssignments.length >= (this.options.maxPending ?? Infinity)) {
    			reject();

    			return;
    		}
            
    		this.pendingAssignments
    		.push({ dataIn, resolve, reject });
            
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