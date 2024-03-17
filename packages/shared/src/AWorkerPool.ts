import { EventEmitter } from "events";
import { cpus } from "os";


/**
 * Interface encoding active worker data. Includes a resolve
 * callback for eventual call upon worker result reception
 * and a timeout attached to terminate exhaustive worker
 * processing runs.
 */
interface IActiveWorker<O> {
    resolve: (dataOut: O) => void;
    timeout: NodeJS.Timeout;
}

/**
 * Interface encoding pending assignment data. Includes a
 * resolve callback for eventual call upon worker result
 * reception as well as the the input data as to be fed to
 * the respectively handling worker entity.
 */
interface IPendingAssignment<I, O> {
    dataIn: I;
    resolve: (dataOut: O) => void;
}


// TODO: Need mutex?

/**
 * Abstract class representing the foundation for concrete
 * descriptions of worker entity pools.
 */
export abstract class AWorkerPool<Worker extends EventEmitter, I, O> extends EventEmitter {
	private readonly baseSize: number;
	private readonly timeout: number;
	private readonly maxPending: number;
	private readonly activeWorkers: Map<Worker, IActiveWorker<O>> = new Map();
	private readonly idleWorkers: Worker[] = [];
	private readonly pendingAssignments: IPendingAssignment<I, O>[] = [];

	constructor(baseSize?: number, timeout: number = 30000, maxPending: number = Infinity) {
		super();
		
    	this.baseSize = Math.min((baseSize || Infinity), cpus().length);
    	this.timeout = timeout;
    	this.maxPending = maxPending;
		
		setImmediate(async () => {
			for(let i = 0; i < this.baseSize; i++) {
				const worker: Worker = await this.createWorker();
    
				this.idleWorkers.push(worker);
			}
			
			this.emit("online");
		});
	}
    
    /**
     * Methods expected to implement the creation / destruction
     * of a worker entity to be returned.
     */
    protected abstract createWorker(): Worker|Promise<Worker>;
    protected abstract destroyWorker(worker: Worker): void;
    
    /**
     * Method expected to activate a worker being given the
     * managed worker and the input data.
     * @param worker Worker that is to be activated
     * @param dataIn Data input according to generic type
     */
    protected abstract activateWorker(worker: Worker, dataIn: I): void;

    /**
     * Internally activate the next candidate worker entity
     * with respectively assigned data.
     */
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

    /**
     * Get unique identifier associated with a worker entity.
     * @param worker Worker entity
     * @returns Numeric identifier
     */
    protected getWorkerId(worker: Worker): number {
    	const optimisticWorkerCast = worker as unknown as {
            threadId: number;
            pid: number;
        };
        
    	return optimisticWorkerCast.threadId ?? optimisticWorkerCast.pid;
    }

    /**
     * Accessibly deactivate a worker entity.
     * @param worker Worker entity
     * @param dataOut Data to write out to the assignment context
     */
    public deactivateWorker(worker: Worker, dataOut: O|Error) {
    	const activeWorker: IActiveWorker<O> = this.activeWorkers.get(worker);

    	if(!activeWorker) return;

    	clearTimeout(activeWorker.timeout);

    	activeWorker
    	.resolve((dataOut instanceof Error) ? null : dataOut);  // TODO: How tohandle errors specifically?

    	this.idleWorkers.push(worker);
        
    	this.activeWorkers.delete(worker);
    }

    /**
     * Assign work to a worker entity possibly pending for
     * being handled in case of exhausted pool capacity.
     * @param dataIn Data input
     * @returns Promise resolving with worker results once done handling
     */
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