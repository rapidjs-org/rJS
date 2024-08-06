export class MultiMap<K, T> {
	private readonly associationMap: Map<K, number> = new Map();
	private readonly valueMap: Map<number, T> = new Map();
    
	private entryCounter = 0;

	private normalizeKeyArgument(keyArgument: K|K[]): K[] {
    	return [ keyArgument ].flat() as K[];
	}

	private smoothenValues() {
    	this.valueMap
    	.forEach((_, key: number) => {
    		!Array.from(this.associationMap.values()).includes(key)
            && this.valueMap.delete(key);
    	});
	}

	/* public getRelatedKeys(key: K): K[] {
		const keys: K[] = [];

		const pivotIdentifier: number = this.associationMap.get(key);
		this.associationMap
		.forEach((identifier: number, key:K) => {
			if(identifier !== pivotIdentifier) return;
			keys.push(key);
		});

		return keys;
	} */
    
	public set(keyArgument: K|K[], value: T) {
    	const keys: K[] = this.normalizeKeyArgument(keyArgument);
        
    	this.valueMap.set(++this.entryCounter, value);
        
    	keys.forEach((key: K) => {
    		this.associationMap.set(key, this.entryCounter);
    	});

    	this.smoothenValues();
	}

	public get(keyArgument: K|K[]): T {
    	const keys: K[] = this.normalizeKeyArgument(keyArgument);

    	for(const key of keys) {
    		const association: number = this.associationMap.get(key);

    		if(association) return this.valueMap.get(association);
    	}

    	return undefined;
	}

	public delete(keyArgument: K|K[]): boolean {
    	const keys: K[] = this.normalizeKeyArgument(keyArgument);
		if(!keys.length) return false;

    	const association: number = this.associationMap.get(keys[0]);
		if(!association) return false;

		if(keys.filter((key: K) => this.associationMap.get(key) !== association).length) {
			throw new SyntaxError("Attempt to delete multiple unrelated keys");
		}

    	keys.forEach((key: K) => {
    		this.associationMap.delete(key);
    	});

		this.smoothenValues();

		return this.valueMap.has(association);
	}

	public has(keyArgument: K|K[]): boolean {
    	const keys: K[] = this.normalizeKeyArgument(keyArgument);

    	for(const key of keys) {
    		if(this.associationMap.has(key)) return true;
    	}

    	return false;
	}

	public clear() {
    	this.associationMap.clear();
    	this.valueMap.clear();
	}

	public size(): number {
    	return this.valueMap.size;
	}
	
	public keys(): K[][] {
    	const consolidatedMap: Map<number, K[]> = new Map();

    	this.associationMap
    	.forEach((internalReference: number, key: K) => {
    		const keyArray: K[] = consolidatedMap.get(internalReference) ?? [];

    		keyArray.push(key);

    		consolidatedMap.set(internalReference, keyArray);
    	});

    	return Array.from(consolidatedMap.values());
	}

	public forEach(callback: (value: T) => void) {
		this.valueMap.forEach((value: T) => callback(value));
	}
}