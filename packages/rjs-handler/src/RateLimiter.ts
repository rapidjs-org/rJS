interface ILimitData {
    timePivot: number;
    previousWindow: number;
    currentWindow: number;
}

export class RateLimiter {
    private readonly limits: Map<string, ILimitData> = new Map();
    private readonly limit: number;
    private readonly windowSize: number;

    constructor(limit: number, windowSize = 60000) {
        this.limit = limit;
        this.windowSize = windowSize;
    }

    public grantsAccess(clientIdentifier: string): boolean {
        if (this.limit === 0) return true;

        const now: number = Date.now();
        const limitData: ILimitData = this.limits.get(clientIdentifier) ?? {
            timePivot: now,
            previousWindow: null,
            currentWindow: 0
        };

        const windowSpan: number = this.windowSize * 2;
        const delta: number = now - limitData.timePivot;
        if (delta > this.windowSize) {
            limitData.previousWindow = limitData.currentWindow;
            limitData.currentWindow = 0;

            if (delta > windowSpan) {
                limitData.timePivot = now;
                limitData.previousWindow = 0;
            }
        }
        limitData.currentWindow += 1;

        this.limits.set(clientIdentifier, limitData);

        const previousWindowWeight: number = (windowSpan - delta) / windowSpan;
        const weightedTotal: number =
            (limitData.previousWindow ?? limitData.currentWindow) *
                previousWindowWeight +
            limitData.currentWindow * (1 - previousWindowWeight);

        return weightedTotal <= this.limit;
    }
}
