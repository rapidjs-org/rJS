import { Options } from "./.shared/Options";

interface IErrorRecord {
    timestamp: number;
}

interface IErrorLimiterOptions {
    threshold: number;
    windowSize: number;
    initPeriodSize: number;
}

export class ErrorLimiter {
    private readonly limitCb: (onInit: boolean) => void;
    private readonly options: IErrorLimiterOptions;

    private isInitPeriod:  boolean = true;
    private records: IErrorRecord[] = [];

    constructor(limitCb: ((onInit: boolean) => void) = (() => {}), options: Partial<IErrorLimiterOptions> = {}) {
        this.limitCb = limitCb;
        this.options = new Options(options, {
            threshold: 3,
            windowSize: 3000,
            initPeriodSize: 3000
        }).object;

        setTimeout(() => {
            this.isInitPeriod = false;
        }, this.options.initPeriodSize);
    }

    public feed() {
        this.records = this.records
        .filter((record: IErrorRecord) => {
            return (Date.now() - record.timestamp) <= this.options.windowSize;
        });

        this.records.push({
            timestamp: Date.now()
        });
        
        if(!this.isInitPeriod
        && this.records.length < this.options.threshold) return;
        
        this.limitCb(this.isInitPeriod);
    }

    public trigger() {
        this.limitCb(false);
    }
}