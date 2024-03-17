import { EventEmitter } from "events";
import { cpus } from "os";
// TODO: Need mutex?
/**
 * Abstract class representing the foundation for concrete
 * descriptions of worker entity pools.
 */
export class AWorkerPool extends EventEmitter {
    constructor(baseSize, timeout = 30000, maxPending = Infinity) {
        super();
        this.activeWorkers = new Map();
        this.idleWorkers = [];
        this.pendingAssignments = [];
        this.baseSize = Math.min((baseSize || Infinity), cpus().length);
        this.timeout = timeout;
        this.maxPending = maxPending;
        setImmediate(async () => {
            for (let i = 0; i < this.baseSize; i++) {
                const worker = await this.createWorker();
                this.idleWorkers.push(worker);
            }
            this.emit("online");
        });
    }
    /**
     * Internally activate the next candidate worker entity
     * with respectively assigned data.
     */
    activate() {
        if (!this.pendingAssignments.length || !this.idleWorkers.length) {
            return;
        }
        const worker = this.idleWorkers.shift();
        const assignment = this.pendingAssignments.shift();
        this.activateWorker(worker, assignment.dataIn);
        this.activeWorkers.set(worker, {
            resolve: assignment.resolve,
            timeout: setTimeout(() => {
                this.deactivateWorker(worker, new Error("")); // TODO: How to signal timeout?
            }, this.timeout)
        });
    }
    /**
     * Get unique identifier associated with a worker entity.
     * @param worker Worker entity
     * @returns Numeric identifier
     */
    getWorkerId(worker) {
        var _a;
        const optimisticWorkerCast = worker;
        return (_a = optimisticWorkerCast.threadId) !== null && _a !== void 0 ? _a : optimisticWorkerCast.pid;
    }
    /**
     * Accessibly deactivate a worker entity.
     * @param worker Worker entity
     * @param dataOut Data to write out to the assignment context
     */
    deactivateWorker(worker, dataOut) {
        const activeWorker = this.activeWorkers.get(worker);
        if (!activeWorker)
            return;
        clearTimeout(activeWorker.timeout);
        activeWorker
            .resolve((dataOut instanceof Error) ? null : dataOut); // TODO: How tohandle errors specifically?
        this.idleWorkers.push(worker);
        this.activeWorkers.delete(worker);
    }
    /**
     * Assign work to a worker entity possibly pending for
     * being handled in case of exhausted pool capacity.
     * @param dataIn Data input
     * @returns Promise resolving with worker results once done handling
     */
    assign(dataIn) {
        return new Promise((resolve, reject) => {
            if (this.pendingAssignments.length >= this.maxPending) {
                reject();
                return;
            }
            this.pendingAssignments
                .push({ dataIn, resolve });
            this.activate();
        });
    }
    clear() {
        delete this.createWorker;
        Array.from(this.activeWorkers.keys())
            .concat(this.idleWorkers)
            .forEach((worker) => {
            this.destroyWorker(worker);
        });
    }
}
