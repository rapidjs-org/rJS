export class ErrorControl {
    private readonly initDuration: number;
    private readonly densityIntervalDuration: number;
            
    constructor(initDuration: number, densityIntervalDuration: number) {
        this.initDuration = initDuration;
        this.densityIntervalDuration = densityIntervalDuration;
    }

    public feed(err: Error|string) {
        // TODO
    }
}