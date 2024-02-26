/**
 * Class representing a mutual exclusion interface based
 * on asynchronous routines. Implements a promise-based
 * lock behavior relying on  a currently pending promise
 * to resolve until queued instruction callbacks are to
 * be resolved in turn. 
 */
export class AsyncMutex<T> {

	private readonly acquireQueue: ((value?: unknown) => void)[] = [];

	private isLocked = false;
	
	private acquire() {
		 if(!this.isLocked) {
			this.isLocked = true;
			
			return Promise.resolve();
		}
		
		return new Promise(resolve => {
			this.acquireQueue.push(resolve);
		});
	}

	public lock(callback: () => T|Promise<T>): Promise<T> {
		return new Promise((resolve: (result: T) => void, reject) => {
			this.acquire()
			.then(() => {
				const callbackResults: T|Promise<T> = callback();
				((callbackResults instanceof Promise)
					? callbackResults
					: Promise.resolve(callbackResults))
				.then((result: T) => resolve(result))
				.catch((err: Error) => reject(err))
				.finally(() => {
					this.isLocked = !!this.acquireQueue.length;
					(this.acquireQueue.shift() || (() => {}))();
				});
			});
		});
	}

}