import * as sharedMemory from "../../shared-memory/api.shared-memory";


type TRate<I> = Map<I, number>;


/**
 * Interface encoding limiter data as shared among cluster
 * related processes sufficient to reproduce state and allow
 * independent updates. Codes access counter by identity maps
 * for two consecutive windows around a supplementory pivot
 * timestamp for update.
 */
interface ILimiterData<I> {
    timePivot: number;
    previousWindow: TRate<I>;
    currentWindow: TRate<I>;
}



/**
 * Class representing a rate limiter providing a cohesive
 * interface for feeding and validating whether a client
 * is limited. A client is supposed to be referenced with
 * a unique identifier (e.g. its IP address). The limiter
 * is implementing a sliding log approach, i.e. two
 * consecutive time frames are reqularly registering client
 * rates and validated for their weighted sliding window
 * total as a reference.
 */
export class RateLimiter<I> {

    private static readonly sharedKey: string = "RL";

    private readonly limit: number;
    private readonly windowSize: number;
    
    constructor(limit: number, windowSize = 60000) {
        this.limit = limit;
        this.windowSize = windowSize;
    }

    /**
     * Update limit data according to the carreid pivot timestamp.
     * I.e. windows are retained, shifted or all-new created.
     * Subsequently, the given identity entry is incremented for
     * the then coded current window.
     */
    private updateLimitData(entityIdentifier: I): ILimiterData<I> {
        const currentLimitData: ILimiterData<I> = sharedMemory.readSync<ILimiterData<I>>(RateLimiter.sharedKey)
        ?? {
            timePivot: Date.now(),
            previousWindow: new Map(),
            currentWindow: new Map()
        };

        currentLimitData.currentWindow.set(entityIdentifier,
            currentLimitData.currentWindow.get(entityIdentifier) + 1);
        
        return currentLimitData;
    }

    /**
     * Check whether the rate has not yet been exceeded for a
     * given client (by consistent identifier).
     * @param entityIdentifier Unique client entity identifier
     * @returns Whether access is granted (the limit has not been exceeded yet)
     */
    public grantsAccess(entityIdentifier: I): boolean {
        const currentLimitData: ILimiterData<I> = this.updateLimitData(entityIdentifier);

        const currentHits: number = (currentLimitData.currentWindow.get(entityIdentifier) ?? 0) + 1;
        
        currentLimitData.currentWindow.set(entityIdentifier, currentHits);

        const currentWindowWeight: number = Math.min((Date.now() - currentLimitData.timePivot) / currentLimitData.windowSize, 1);
        const weightedHits: number
        = ((currentLimitData.previousWindow.get(entityIdentifier) ?? 0) * (1 - currentWindowWeight))
        + (currentHits * currentWindowWeight);
        
        return (weightedHits <= this.limit);
    }
}