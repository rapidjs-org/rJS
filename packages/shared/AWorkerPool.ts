import { EventEmitter } from "events";
import { cpus } from "os";


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


export interface IWorkerPoolOptions {
	baseSize?: number;
	timeout?: number;
	maxPending?: number;
}

// TODO: Need mutex?
export abstract class AWorkerPool<Worker extends EventEmitter, I, O, E> extends EventEmitter {
	private readonly options: IWorkerPoolOptions;
	private readonly activeWorkers: Map<Worker, IActiveWorker<O, E>> = new Map();
	private readonly idleWorkers: Worker[] = [];
	private readonly pendingAssignments: IPendingAssignment<I, O, E>[] = [];

	protected readonly workerModulePath: string;

	public isOnline: boolean = false;

	constructor(workerModulePath: string, options: IWorkerPoolOptions = {}) {
		super();

		this.options = {
			baseSize: Math.min((options.baseSize || Infinity), cpus().length),
			timeout: 30000,
			maxPending: Infinity,

			...options
		};

		this.workerModulePath = workerModulePath;
		
		setImmediate(async () => {
			for(let i = 0; i < Math.max(this.options.baseSize ?? 1,); i++) {
				this.spawnWorker();
			}
			
			this.emit("online");

			this.isOnline = true;
		});
	}
    
    protected abstract createWorker(): Worker|Promise<Worker>;
    protected abstract destroyWorker(worker: Worker): void;
    protected abstract activateWorker(worker: Worker, dataIn: I): void;
	protected abstract onTimeout(worker: Worker): void;

	private activate() {
    	if(!this.pendingAssignments.length
		|| !this.idleWorkers.length) {
    		return;
    	}

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

	public deactivateWorker(worker: Worker, dataOut?: O) {
    	const activeWorker: IActiveWorker<O, E> = this.activeWorkers.get(worker)!;

    	if(!activeWorker) return;

    	clearTimeout(activeWorker.timeout);

    	dataOut
		&& activeWorker.resolve(dataOut);

    	this.idleWorkers.push(worker);
        
    	this.activeWorkers.delete(worker);
	}

	public deactivateWorkerWithError(worker: Worker, err?: E) {
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

	public clear() {
    	Array.from(this.activeWorkers.keys())
    	.concat(this.idleWorkers)
    	.forEach((worker: Worker) => {
    		this.destroyWorker(worker);
    	});
	}

	// TODO: Elastic size
}