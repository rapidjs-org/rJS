/**
 * Class representing a mutual exclusion interface based
 * on asynchronous routines. Implements a promise-based
 * lock behavior relying on  a currently pending promise
 * to resolve until queued instruction callbacks are to
 * be resolved in turn.
 */
export declare class AsyncMutex<T> {
    private readonly acquireQueue;
    private isLocked;
    private acquire;
    lock(callback: () => T | Promise<T>): Promise<T>;
}
//# sourceMappingURL=AsyncMutex.d.ts.map