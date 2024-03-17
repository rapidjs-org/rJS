/// <reference types="node" />
import { EventEmitter } from "events";
type TInterceptCallback = (message: string) => string;
type TStreamIdentifier = "out" | "err";
export declare class LogIntercept extends EventEmitter {
    static instances: LogIntercept[];
    static applyAll(streamIdentifier: TStreamIdentifier, message: string): string;
    private readonly outCallbacks;
    private readonly errCallbacks;
    constructor();
    private apply;
    onOut(interceptCallback: TInterceptCallback): this;
    onErr(interceptCallback: TInterceptCallback): this;
    onBoth(interceptCallback: TInterceptCallback): this;
    out(message: string): string;
    err(message: string): string;
}
export {};
//# sourceMappingURL=LogIntercept.d.ts.map