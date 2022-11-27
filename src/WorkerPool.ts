import { EventEmitter as Worker, EventEmitter } from "events";
import { cpus } from "os";


interface IAssignment<I, O> {
    dataIn: I;
    resolve: (dataOut: O) => void;
}


export abstract class WorkerPool<I, O> {

    private readonly baseSize: number;
    private readonly timeout: number;
    private readonly maxPending: number;
    private readonly activeWorkers: Map<number, {
        resolve: (dataOut: O) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();
    private readonly idleWorkers: Worker[] = [];
    private readonly pendingAssignments: IAssignment<I, O>[] = [];

    public readonly eventEmitter = new EventEmitter();

    constructor(baseSize: number = cpus().length, timeout: number = 30000, maxPending: number = Infinity) {
        this.baseSize = baseSize;
        this.timeout = timeout;
        this.maxPending = maxPending;
    }

    protected abstract createWorker(): Worker;
    
    protected abstract activateWorker(worker: Worker, dataIn: I): void;

    private activate() {
        if(!this.pendingAssignments.length || !this.idleWorkers.length) {
            return;
        }

        const worker: Worker = this.idleWorkers.shift();
        const workerId: number = this.getWorkerId(worker);
        const assignment: IAssignment<I, O> = this.pendingAssignments.shift();

        this.activateWorker(worker, assignment.dataIn);
        
        this.activeWorkers
        .set(workerId, {
            resolve: assignment.resolve,
            timeout: setTimeout(() => {
                this.deactivateWorker(worker, null);    // TODO: How to signal timeout?
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

    public deactivateWorker(worker: Worker, dataOut: O) {
        const workerId: number = this.getWorkerId(worker);

        this.activeWorkers
        .get(workerId)
        .resolve(dataOut);

        this.activeWorkers.delete(workerId);

        this.idleWorkers.push(worker);

        this.activate();
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

    public init() {
        Array.from({ length: this.baseSize }, () => {
            const worker = this.createWorker();

            /* worker.on("err", (err: Error) => {
                console.error(err);
            }); */
            
            worker.on("exit", (code: number) => {
                console.log("EXIT: " + code);

                // TODO: Handle
                // TODO: Error control
            });

            this.idleWorkers.push(worker);
        });

        delete this.init;   // Singleton usage
    }

    // TODO: Elastic size

    /* public getCurrentSize(): number {
        return this.activeWorkers.size + this.idleWorkers.length;
    } */

    // TODO: Dynamic sizing

}