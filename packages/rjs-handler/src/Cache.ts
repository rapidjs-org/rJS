// TODO: Cache entry max size threshold (keep memory “clean”)?

export class Cache<K, T> extends Map<K, T> {
	private readonly keyStoreTimestamps: Map<K, number> = new Map();
	private readonly duration: number;

	constructor(duration: number) {
		super();

		this.duration = duration;
	}

	public get(key: K): T {
		return this.has(key) ? super.get(key) : undefined;
	}

	public has(key: K): boolean {
		if (this.duration === 0) return false;

		if (!this.keyStoreTimestamps.has(key)) return false;

		if (Date.now() - this.keyStoreTimestamps.get(key) <= this.duration)
			return true;

		this.keyStoreTimestamps.delete(key);
		this.delete(key);

		return false;
	}
}
