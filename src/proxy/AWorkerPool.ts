import { EventEmitter as Worker } from "events";
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
export abstract class AWorkerPool<I, O> {

    private readonly baseSize: number;
    private readonly timeout: number;
    private readonly maxPending: number;
    private readonly activeWorkers: Map<number, IActiveWorker<O>> = new Map();
    private readonly idleWorkers: Worker[] = [];
    private readonly pendingAssignments: IPendingAssignment<I, O>[] = [];

    constructor(baseSize: number = cpus().length, timeout: number = 30000, maxPending: number = Infinity) {
        this.baseSize = baseSize;
        this.timeout = timeout;
        this.maxPending = maxPending;
    }

    /**
     * Method expected to implement the creation of a worker
     * entity to be returned.
     * @returns Worker or promise resolving to worker as to be fed to the system
     */
    protected abstract createWorker(): Worker|Promise<Worker>;
    
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
        const workerId: number = this.getWorkerId(worker);
        const assignment: IPendingAssignment<I, O> = this.pendingAssignments.shift();

        this.activateWorker(worker, assignment.dataIn);
        
        this.activeWorkers
        .set(workerId, {
            resolve: assignment.resolve,
            timeout: setTimeout(() => {
                this.deactivateWorker(worker, new Error(""));    // TODO: How to signal timeout?
            }, this.timeout)
        });
    }

    /**
     * Internally deactivate a worker entity by registering
     * it back to the candidate queue and motivating possibly
     * pending input data handling.
     * @param workerId Worker entity identifier
     */
    private deactivate(workerId: number) {
        this.activeWorkers.delete(workerId);

        this.activate();
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
        const workerId: number = this.getWorkerId(worker);

        const activeWorker: IActiveWorker<O> = this.activeWorkers.get(workerId);

        clearTimeout(activeWorker.timeout);

        activeWorker
        .resolve((dataOut instanceof Error) ? null : dataOut);  // TODO: How tohandle errors specifically?

        this.idleWorkers.push(worker);

        this.deactivate(workerId);
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

    /**
     * Initialize the worker pool based on the defined base or
     * derived base size. Spins up worker entities to the
     * candidate queue waiting for work.
     */
    public init() {
        Array.from({ length: this.baseSize }, () => {
            const worker = this.createWorker();

            (!(worker instanceof Promise)
            ? new Promise(resolve => resolve(worker))
            : worker)
            .then((worker: Worker) => {
                /* worker.on("err", (err: Error) => {
                    console.error(err);
                }); */
                
                worker.on("exit", (code: number) => {
                    if(code === 0) {
                        return;
                    }
    
                    this.deactivate(this.getWorkerId(worker));
    
                    // TODO: Handle
                    // TODO: Error control
                });

                this.idleWorkers.push(worker);
            });
        });

        /*
         * Enforce singleton usage of initialization method by
         * deleting the method member once called.
         */
        delete this.init;   // Singleton usage
    }

    // TODO: Elastic size

    /* public getCurrentSize(): number {
        return this.activeWorkers.size + this.idleWorkers.length;
    } */

    // TODO: Dynamic sizing

}