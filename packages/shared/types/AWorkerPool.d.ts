/// <reference types="node" />
import { EventEmitter } from "events";
/**
 * Abstract class representing the foundation for concrete
 * descriptions of worker entity pools.
 */
export declare abstract class AWorkerPool<Worker extends EventEmitter, I, O> extends EventEmitter {
    private readonly baseSize;
    private readonly timeout;
    private readonly maxPending;
    private readonly activeWorkers;
    private readonly idleWorkers;
    private readonly pendingAssignments;
    constructor(baseSize?: number, timeout?: number, maxPending?: number);
    /**
     * Methods expected to implement the creation / destruction
     * of a worker entity to be returned.
     */
    protected abstract createWorker(): Worker | Promise<Worker>;
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
    private activate;
    /**
     * Get unique identifier associated with a worker entity.
     * @param worker Worker entity
     * @returns Numeric identifier
     */
    protected getWorkerId(worker: Worker): number;
    /**
     * Accessibly deactivate a worker entity.
     * @param worker Worker entity
     * @param dataOut Data to write out to the assignment context
     */
    deactivateWorker(worker: Worker, dataOut: O | Error): void;
    /**
     * Assign work to a worker entity possibly pending for
     * being handled in case of exhausted pool capacity.
     * @param dataIn Data input
     * @returns Promise resolving with worker results once done handling
     */
    assign(dataIn: I): Promise<O>;
    clear(): void;
}
//# sourceMappingURL=AWorkerPool.d.ts.map