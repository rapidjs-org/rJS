interface ILimitData {
    timePivot: number;
    previousWindow: number;
    currentWindow: number;
}


// TODO: Periodic check for whether entry needs to be freed (+ max size)
export class RateLimiter {
	private readonly limits: Map<string, ILimitData> = new Map();
	private readonly limit: number;
	private readonly windowSize: number;

	// TODO: Period for close by after requests to not lookup
	
	constructor(limit: number, windowSize = 60000) {
    	this.limit = limit;
    	this.windowSize = windowSize;
	}

	public grantsAccess(clientIdentifier: string): boolean {
    	const now: number = Date.now();
		const limitData: ILimitData = this.limits.get(clientIdentifier) ?? {
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
		
		this.limits.set(clientIdentifier, limitData);

		const currentWeight: number = Math.max(0, this.windowSize - delta);
		const weightedTotal: number = (limitData.previousWindow * (1 - currentWeight))
									+ (limitData.currentWindow * currentWeight);

    	return weightedTotal <= this.limit /* / ThreadPool.size() ??? */;	// Optimistic; i.e. assume even distribution across worker processes
	}
}