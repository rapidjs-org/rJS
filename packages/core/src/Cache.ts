const _config = {
	defaultCacheDuration: 5000
};


export class Cache<T> extends Map<string, T> {
	private readonly keyStoreTimestamps: Map<string, number> = new Map();
	private readonly duration: number;

	constructor(duration: number = _config.defaultCacheDuration) {
		super();

		this.duration = duration;
	}

	public get(key: string): T {
		return this.has(key) 
			? super.get(key)
			: undefined;
	}
    
	public has(key: string): boolean {
		if(!this.keyStoreTimestamps.has(key)) return false;
		
		if((Date.now() - this.keyStoreTimestamps.get(key)) <= this.duration)
			return true;

		this.keyStoreTimestamps.delete(key);
		this.delete(key);

		return false;
	}
}