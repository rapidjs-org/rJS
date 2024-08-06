import { Config } from "./Config";


// TODO: Cach entry max size threshold (keep memory “clean”)?

export class Cache<K, T> extends Map<K, T> {
	private readonly keyStoreTimestamps: Map<K, number> = new Map();
	private readonly duration: number;

	constructor(duration: number = (process.env.DEV ? Config.global.read("peformance", "serverCacheMs").number() : null) ?? Infinity) {
		super();
		
		this.duration = duration;
	}

	public get(key: K): T {
		return this.has(key) 
			? super.get(key)
			: undefined;
	}
	
	public has(key: K): boolean {
		if(!this.keyStoreTimestamps.has(key)) return false;
		
		if((Date.now() - this.keyStoreTimestamps.get(key)) <= this.duration)
			return true;

		this.keyStoreTimestamps.delete(key);
		this.delete(key);

		return false;
	}
}