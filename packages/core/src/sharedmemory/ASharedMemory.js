import * as sharedmemoryAPI from "./api.sharedmemory";
const _config = {
    exclusiveKeyDelimiter: "|",
    keyRegex: /^[^|]*$/i
};
// TODO: Single core/io trap
export class ASharedMemory {
    constructor(uniqueKey = (ASharedMemory.deterministicIncrementalKey++).toString()) {
        this.activeKeys = new Set();
        this.validateKey(uniqueKey);
        this.uniqueKey = `${process.cwd()}${_config.exclusiveKeyDelimiter}${uniqueKey}`;
    }
    validateKey(key) {
        if (_config.keyRegex.test(key))
            return;
        throw new SyntaxError(`Invalid shared memory key name "${key}"`);
    }
    getUniqueItemKey(itemKey) {
        this.validateKey(itemKey);
        return `${this.uniqueKey}${_config.exclusiveKeyDelimiter}${itemKey}`;
    }
    readSHM(itemKey) {
        return sharedmemoryAPI.read(this.getUniqueItemKey(itemKey));
    }
    writeSHM(itemKey, itemValue) {
        sharedmemoryAPI.write(this.getUniqueItemKey(itemKey), itemValue);
        this.activeKeys.add(itemKey);
        return this;
    }
    freeSHM(itemKey) {
        sharedmemoryAPI.free(this.getUniqueItemKey(itemKey));
        this.activeKeys.delete(itemKey);
    }
}
ASharedMemory.deterministicIncrementalKey = 0;
// TODO: Implement local cache to reduce SHM operations?
