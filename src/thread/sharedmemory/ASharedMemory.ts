import * as sharedmemoryAPI from "./api.sharedmemory";


const _config = {
	exclusiveKeyDelimiter: "|",
	keyRegex: /^[^|]*$/i
};

// TODO: Single core/io trap

export abstract class ASharedMemory<T> {
	private static deterministicIncrementalKey: number = 0;

	private readonly activeKeys: Set<string> = new Set();
	private readonly uniqueKey: string;

	constructor(uniqueKey: string = (ASharedMemory.deterministicIncrementalKey++).toString()) {
		this.validateKey(uniqueKey);

		this.uniqueKey = `${process.cwd()}${_config.exclusiveKeyDelimiter}${uniqueKey}`;
	}

	private validateKey(key: string) {
		if(_config.keyRegex.test(key)) return;

		throw new SyntaxError(`Invalid shared memory key name "${key}"`);
	}

	private getUniqueItemKey(itemKey: string): string {
		this.validateKey(itemKey);

		return `${this.uniqueKey}${_config.exclusiveKeyDelimiter}${itemKey}`;
	}

	protected readSHM(itemKey: string): T {
		return sharedmemoryAPI.read(this.getUniqueItemKey(itemKey));
	}

	protected writeSHM(itemKey: string, itemValue: T) {
		sharedmemoryAPI.write(this.getUniqueItemKey(itemKey), itemValue);
		
		this.activeKeys.add(itemKey);

		return this;
	}

	protected freeSHM(itemKey: string) {
		sharedmemoryAPI.free(this.getUniqueItemKey(itemKey));

		this.activeKeys.delete(itemKey);
	}
}

// TODO: Implement local cache to reduce SHM operations?