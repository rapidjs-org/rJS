/**
 * Class representing a map data structure supporting
 * multiple keys associated with a common value. Values
 * to be stored in map as long as at least one key is
 * associated with it.
 */
export class MultiMap<K, T> {

    private readonly associationMap: Map<K, number> = new Map();
    private readonly valueMap: Map<number, T> = new Map();
    
    /*
     * Use a simple inceremental value counter as unique
     * internal association reference. Multi map usage
     * presumed in low capacity scenarios.
     */
    private entryCounter: number = 0;

    private normalizeKeyArgument(keyArgument: K|K[]): K[] {
        return [ keyArgument ].flat() as K[];
    }

    private cleanValues() {
        this.valueMap
        .forEach((_, key: number) => {
            !Array.from(this.associationMap.values()).includes(key)
            && this.valueMap.delete(key);
        });
    }
    
    /**
     * Set a value to the map given an arbitrary, non-zero
     * integral amount of keys to associate with.
     * @param keyArgument Atomic key or array of keys to associate
     * @param value Common value
     */
    public set(keyArgument: K|K[], value: T) {
        const keys: K[] = this.normalizeKeyArgument(keyArgument);
        
        this.valueMap.set(++this.entryCounter, value);
        
        keys.forEach((key: K) => {
            this.associationMap.set(key, this.entryCounter);
        });

        this.cleanValues();
    }

    /**
     * Get a value by atomic key.
     * @param key Atomic key associated with value
     * @returns Associated value
     */
    public get(keyArgument: K|K[]): T {
        const keys: K[] = this.normalizeKeyArgument(keyArgument);

        for(let key of keys) {
            const association: number = this.associationMap.get(key);

            if(association) return this.valueMap.get(association);
        }

        return undefined;
    }

    /**
     * Delete a value by atomic key.
     * @param key Atomic key associated with value
     */
    public delete(keyArgument: K|K[]) {
        const keys: K[] = this.normalizeKeyArgument(keyArgument);

        keys.forEach((key: K) => {
            if(!this.associationMap.has(key)) return;

            this.associationMap.delete(key);
        });
        
        this.cleanValues();
    }

    /**
     * Check whether a given atomic key is associated
     * with a value in the map.
     * @param key Atomic key to check for
     * @returns Whether an associated value exists
     */
    public has(keyArgument: K|K[]): boolean {
        const keys: K[] = this.normalizeKeyArgument(keyArgument);

        for(let key of keys) {
            if(this.associationMap.has(key)) return true;
        }

        return false;
    }

    /**
     * Get the size of the map depicting the number of
     * values existing tin the map.
     * @returns Size
     */
    public size(): number {
        return this.valueMap.size;
    }

    /**
     * Get keys as nested array of association related
     * key arrays.
     * @returns Array of related key arrays
     */
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

}