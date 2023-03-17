import { ASharedDictionary } from "../ASharedDictionary";


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
export class RateLimiter<I> extends ASharedDictionary<I, ILimiterData<I>> {

    private readonly limit: number;
    private readonly windowSize: number;
    
    constructor(limit: number, windowSize = 60000) {
        super();

        this.limit = limit;
        this.windowSize = windowSize;
    }
    
    /**
     * Update limit data according to the carreid pivot timestamp.
     * I.e. windows are retained, shifted or all-new created.
     * Subsequently, the given identity entry is incremented for
     * the then coded current window.
     */
    private updateLimitData(): ILimiterData<I> {
        const currentLimitData: ILimiterData<I> = this.readShared()
        ?? {
            timePivot: Date.now(),
            previousWindow: new Map(),
            currentWindow: new Map()
        };

        const now: number = Date.now();
        const nowPivot: number = now - currentLimitData.timePivot;
        
        if(nowPivot <= this.windowSize) return currentLimitData;

        currentLimitData.currentWindow = (nowPivot <= (2 * this.windowSize))
        ? currentLimitData.currentWindow
        : new Map();

        currentLimitData.previousWindow = currentLimitData.currentWindow;
        currentLimitData.currentWindow = new Map();

        currentLimitData.timePivot = now;
        
        return currentLimitData;
    }

    /**
     * Check whether the rate has not yet been exceeded for a
     * given client (by consistent identifier).
     * @param entityIdentifier Unique client entity identifier
     * @returns Whether access is granted (the limit has not been exceeded yet)
     */
    public grantsAccess(entityIdentifier: I): boolean {
        const currentLimitData: ILimiterData<I> = this.updateLimitData();

        const currentHits: number = (currentLimitData.currentWindow.get(entityIdentifier) ?? 0) + 1;
        
        currentLimitData.currentWindow.set(entityIdentifier, currentHits);
        
        const currentWindowWeight: number = Math.min((Date.now() - currentLimitData.timePivot) / this.windowSize, 1);
        const weightedHits: number
        = ((currentLimitData.previousWindow.get(entityIdentifier) ?? 0) * (1 - currentWindowWeight))
        + (currentHits * currentWindowWeight);

        this.writeShared(currentLimitData);
        
        return (weightedHits <= this.limit);
    }
}