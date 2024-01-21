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
        process.on("exit", freeAllHandler);
        process.on("SIGINT", freeAllHandler);
        process.on("SIGUSR1", freeAllHandler);
        process.on("SIGUSR2", freeAllHandler);
        process.on("uncaughtException", freeAllHandler);
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
        return null;
        //return sharedMemory.read<T>(this.getUniqueItemKey(itemKey));
    }

    protected writeSHM(itemKey: string, itemValue: T) {
        //sharedMemory.write<T>(this.getUniqueItemKey(itemKey), itemValue);

        this.activeKeys.add(itemKey);

        return this;
    }

    protected freeSHM(itemKey: string) {
        // TODO: ... this.getUniqueItemKey(itemKey)

        this.activeKeys.delete(itemKey);
    }
}