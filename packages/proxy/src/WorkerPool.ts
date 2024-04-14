import { EventEmitter } from "events";
import { cpus } from "os";


interface IActiveWorker<O> {
    resolve: (dataOut: O) => void;
    timeout: NodeJS.Timeout;
}

interface IPendingAssignment<I, O> {
    dataIn: I;
    resolve: (dataOut: O) => void;
}

// TODO: Need mutex?

export abstract class WorkerPool<Worker extends EventEmitter, I, O> extends EventEmitter {
	private readonly baseSize: number;
	private readonly timeout: number;
	private readonly maxPending: number;
	private readonly activeWorkers: Map<Worker, IActiveWorker<O>> = new Map();
	private readonly idleWorkers: Worker[] = [];
	private readonly pendingAssignments: IPendingAssignment<I, O>[] = [];

	protected readonly workerModulePath: string;

	public isOnline: boolean = false;

	constructor(workerModulePath: string, baseSize: number, timeout: number, maxPending: number) {
		super();
		
    	this.baseSize = Math.min((baseSize || Infinity), cpus().length);
    	this.timeout = timeout;
    	this.maxPending = maxPending;

		this.workerModulePath = workerModulePath;
		
		setImmediate(async () => {
			for(let i = 0; i < this.baseSize; i++) {
				const worker: Worker = await this.createWorker();
    
				this.idleWorkers.push(worker);
			}
			
			this.emit("online");

			this.isOnline = true;
		});
	}
    
    protected abstract createWorker(): Worker|Promise<Worker>;
    protected abstract destroyWorker(worker: Worker): void;
    protected abstract activateWorker(worker: Worker, dataIn: I): void;

    private activate() {
    	if(!this.pendingAssignments.length || !this.idleWorkers.length) {
    		return;
    	}

    	const worker: Worker = this.idleWorkers.shift();
    	const assignment: IPendingAssignment<I, O> = this.pendingAssignments.shift();
        
    	this.activateWorker(worker, assignment.dataIn);
        
    	this.activeWorkers.set(worker, {
    		resolve: assignment.resolve,
    		timeout: setTimeout(() => {
    			this.deactivateWorker(worker, new Error(""));    // TODO: How to signal timeout?
    		}, this.timeout)
    	});
    }

    protected getWorkerId(worker: Worker): number {
    	const optimisticWorkerCast = worker as unknown as {
            threadId: number;
            pid: number;
        };
        
    	return optimisticWorkerCast.threadId ?? optimisticWorkerCast.pid;
    }

    public deactivateWorker(worker: Worker, dataOut: O|Error) {
    	const activeWorker: IActiveWorker<O> = this.activeWorkers.get(worker);

    	if(!activeWorker) return;

    	clearTimeout(activeWorker.timeout);

    	activeWorker
    	.resolve((dataOut instanceof Error) ? null : dataOut);  // TODO: How tohandle errors specifically?

    	this.idleWorkers.push(worker);
        
    	this.activeWorkers.delete(worker);
    }

    public assign(dataIn: I): Promise<O> {
    	return new Promise((resolve: (dataOut: O) => void, reject) => {
    		if(this.pendingAssignments.length >= this.maxPending) {
    			reject();

    			return;
    		}
            
    		this.pendingAssignments
    		.push({ dataIn, resolve });
            
    		this.activate();
    	});
    }

    public clear() {
    	delete this.createWorker;

    	Array.from(this.activeWorkers.keys())
    	.concat(this.idleWorkers)
    	.forEach((worker: Worker) => {
    		this.destroyWorker(worker);
    	});
    }

	// TODO: Elastic size
}