import { TJSON } from "./types";
export declare class Config {
    private readonly obj;
    private cumulatedErrorMessages;
    private errorImmediate;
    constructor(relativeDirPath: string, defaultObj?: TJSON);
    private raiseSyntaxError;
    addTypeConstraint(keys: string | string[], typeConstraint: string | string[]): this;
    addDefinedConstraint(...keys: string[]): this;
    get<T>(...keys: string[]): T;
}
//# sourceMappingURL=Config.d.ts.map