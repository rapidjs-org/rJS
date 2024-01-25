import { ASharedMemory } from "./sharedmemory/ASharedMemory";


const _config = {
	defaultCacheDuration: 5000
};


// Mastering cache instance process must free shared memory in order
// to use a single process visible timeout. 
export class Cache<T> extends ASharedMemory<T> {
	private readonly keyStoreTimestamps: Map<string, number> = new Map();
	private readonly duration: number;

	constructor(uniqueKey: string, duration: number = _config.defaultCacheDuration) {
		super(uniqueKey);

		this.duration = duration;

		console.log(this.readSHM("adaw"));
	}

	public get(key: string): T {
		return this.has(key) 
			? this.readSHM(key)
			: undefined;
	}
    
	public set(key: string, value: T) {
		return super.writeSHM(key, value);
	}
    
	public has(key: string): boolean {
		if(!this.keyStoreTimestamps.has(key)) {
			return !!this.readSHM(key);
		}
		if(Date.now() - this.keyStoreTimestamps.get(key) <= this.duration) {
			return true;
		}

		this.freeSHM(key);

		return false;
	}
}