import * as sharedMemory from "./sharedmemory";


const _config = {
    exclusiveKeyDelimiter: ":",
    keyRegex: /^[^:]*$/i
};


export abstract class ASharedMemory<T> {
    private static deterministicIncrementalKey: number = 0;

    private readonly activeKeys: Set<string> = new Set();
    private readonly uniqueKey: string;

    constructor(uniqueKey: string = (ASharedMemory.deterministicIncrementalKey++).toString()) {
        this.validateKey(uniqueKey);

        this.uniqueKey = uniqueKey;

        const freeAllHandler = () => {
            this.activeKeys
            .forEach((key: string) => this.freeSHM(key));
        };
        [ "exit", "SIGINT", "SIGTERM", "SIGQUIT", "SIGUSR1", "SIGUSR2", "uncaughtException" ]
        .forEach(signal => {
            process.on(signal, freeAllHandler);
        });
    }

    private validateKey(key: string) {
        if(_config.keyRegex.test(this.uniqueKey)) return;
        
        throw new SyntaxError(`Invalid shared map key name "${key}"`);
    }

    private getUniqueItemKey(itemKey: string): string {
        this.validateKey(itemKey);

        return `${this.uniqueKey}${_config.exclusiveKeyDelimiter}${itemKey}`;
    }

    protected readSHM(itemKey: string): T {
        const data: Buffer = sharedMemory.read(this.getUniqueItemKey(itemKey));
        
        return data as T;   // TODO: Conversion
    }

    protected writeSHM(itemKey: string, itemValue: T) {
        const bufferedItemValue: Buffer = Buffer.from(itemValue.toString(), "utf-8");

        sharedMemory.write(this.getUniqueItemKey(itemKey), bufferedItemValue);
        
        this.activeKeys.add(itemKey);

        return this;
    }

    protected freeSHM(itemKey: string) {
        // TODO: ... this.getUniqueItemKey(itemKey)

        this.activeKeys.delete(itemKey);
    }
}