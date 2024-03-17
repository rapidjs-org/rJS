/**
 * Class representing a mutual exclusion interface based
 * on asynchronous routines. Implements a promise-based
 * lock behavior relying on  a currently pending promise
 * to resolve until queued instruction callbacks are to
 * be resolved in turn.
 */
export class AsyncMutex {
    constructor() {
        this.acquireQueue = [];
        this.isLocked = false;
    }
    acquire() {
        if (!this.isLocked) {
            this.isLocked = true;
            return Promise.resolve();
        }
        return new Promise(resolve => {
            this.acquireQueue.push(resolve);
        });
    }
    lock(callback) {
        return new Promise((resolve, reject) => {
            this.acquire()
                .then(() => {
                const callbackResults = callback();
                ((callbackResults instanceof Promise)
                    ? callbackResults
                    : Promise.resolve(callbackResults))
                    .then((result) => resolve(result))
                    .catch((err) => reject(err))
                    .finally(() => {
                    this.isLocked = !!this.acquireQueue.length;
                    (this.acquireQueue.shift() || (() => { }))();
                });
            });
        });
    }
}
