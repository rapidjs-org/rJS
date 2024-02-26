import { ASharedMemory } from "./sharedmemory/ASharedMemory";


interface ILimitData {
    timePivot: number;
    previousWindow: number;
    currentWindow: number;
}


// TODO: Periodic check for whether entry needs to be freed (+ max size)
export class RateLimiter extends ASharedMemory<ILimitData> {
	private readonly limit: number;
	private readonly windowSize: number;
	
	constructor(limit: number, windowSize = 60000) {
    	super("rate-limiter");

    	this.limit = limit;
    	this.windowSize = windowSize;
	}

	public grantsAccess(clientIdentifier: string): boolean {
    	const now: number = Date.now();
		const limitData: ILimitData = this.readSHM(clientIdentifier) ?? {
        	timePivot: now,
        	previousWindow: 0,
        	currentWindow: 0
		};

    	const delta: number = now - limitData.timePivot;
		if(delta > this.windowSize) {
			limitData.previousWindow = limitData.currentWindow;
			limitData.currentWindow = 0;

			if(delta > (this.windowSize * 2)) {
				limitData.previousWindow = 0;
			}
		}
		/* 
		console.log("d: " + delta)
		console.log(clientIdentifier)
		console.log(limitData)
		console.log("–––––––––––––")
		limitData.currentWindow += 1;
		 */
		this.writeSHM(clientIdentifier, limitData);

		const currentWeight: number = Math.max(0, this.windowSize - delta);
		const weightedTotal: number = (limitData.previousWindow * (1 - currentWeight))
									+ (limitData.currentWindow * currentWeight);

    	return weightedTotal <= this.limit;
	}
}
// TODO: Reduce required SHM access; use fixed hash client to process assignment etc. (?)