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

	/**
	 * Acquire a processing spot, i.e. either direct resolution
	 * in unlocked state or queue it for eventual lock and process.
	 * Allows for prioritizing the current over previous acquisitions.
	 * @param prioritize Whether to prioritize the current acquisition
	 * @returns Promise resolving once has been successfully acquired
	 */
	private acquire(prioritize: boolean) {
		 if(!this.isLocked) {
			this.isLocked = true;
			
			return Promise.resolve();
		}
		
		return new Promise(resolve => {
			this.acquireQueue[prioritize ? "unshift" : "push"](resolve);
		});
	}

	/**
	 * Lock the mutex with the current instructions to be processed
	 * once implicit memory acquisition is successful.
	 * @param instructions Instructions callback to be invoked once in turn
	 * @param prioritize Whether to optionally prioritize the current acquisition
	 * @returns Promise resolving to the instruction callback return value upon acquisition success
	 */
	public lock(instructions: (() => T)|Promise<T>, prioritize = false): Promise<T> {
		return new Promise((resolve: (result: T) => void, reject) => {
			this.acquire(prioritize)
			.then(() => {
				(!(instructions instanceof Promise)
					? new Promise<unknown>(r => r(instructions()))
					: instructions)
				.then((result: T) => resolve(result))
				.catch((err: Error) => reject(err))
				.finally(() => {
					this.acquireQueue.length
						? this.acquireQueue.shift()()
						: (this.isLocked = false);
				});
			});
		});
	}

}