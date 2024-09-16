import { EventEmitter } from "events";
import { Options } from "./.shared/Options";

interface IErrorRecord {
    err: Error|unknown;
    timestamp: number;
}

export interface IErrorLimiterOptions {
    threshold: number;
    windowMs: number;
    initPeriodMs: number;
}

export class ErrorLimiter extends EventEmitter {
    private readonly options: IErrorLimiterOptions;

    private isInitPeriod: boolean;
    private records: IErrorRecord[] = [];

    constructor(options?: Partial<IErrorLimiterOptions>) {
        super();

        this.options = new Options<IErrorLimiterOptions>(options, {
            threshold: 3,
            windowMs: 3000,
            initPeriodMs: 3000
        }).object;
        
        this.isInitPeriod = (this.options.initPeriodMs > 0);
        setTimeout(() => {
            this.isInitPeriod = false;
        }, this.options.initPeriodMs);
    }

    public feed(err?: Error|unknown) {
        this.emit("feed", err);
        
        this.records = this.records
        .filter((record: IErrorRecord) => {
            return (Date.now() - record.timestamp) <= this.options.windowMs;
        });

        this.records.push({
            err,
            timestamp: Date.now()
        });

        if(!this.isInitPeriod
        && this.records.length < this.options.threshold) return;
        
        this.emit("terminate", this.isInitPeriod);
    }
}