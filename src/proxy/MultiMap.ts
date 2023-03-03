/**
 * Class representing a map data structure supporting
 * multiple keys associated with a common value. Values
 * to be stored in map as long as at least one key is
 * associated with it.
 */

export class MultiMap<K, T> {

    private readonly valueMap: Map<number, T> = new Map();
    private readonly associationMap: Map<K, number> = new Map();
    private readonly associationTotalMap: Map<number, number> = new Map();

    /* 
     * Use a simple inceremental value counter as unique
     * internal association reference.
     */
    private entryCounter: number = 0;
    
    /**
     * Set a value to the map given an arbitrary, non-zero
     * integral amount of keys to associate with.
     * @param keyArgument Atomic key or array of keys to associate
     * @param value Common value
     */
    public set(keyArgument: K|K[], value: T) {        
        const keys: K[] = [ keyArgument ].flat() as K[];

        this.valueMap.set(++this.entryCounter, value);
        
        keys.forEach((key: K) => {
            this.associationMap.set(key, this.entryCounter);
        });

        this.associationTotalMap.set(this.entryCounter, keys.length);
    }

    /**
     * Get a value by atomic key.
     * @param key Atomic key associated with value
     * @returns Associated value
     */
    public get(key: K): T {
        return this.valueMap.get(this.associationMap.get(key));
    }

    /**
     * Delete a value by atomic key.
     * @param key Atomic key associated with value
     */
    public delete(key: K) {
        const association: number = this.associationMap.get(key);
        const associationTotal: number = this.associationTotalMap.get(association);

        this.associationMap.delete(key);
        
        if(associationTotal > 1) {
            this.associationTotalMap.set(association, associationTotal - 1);

            return;
        }

        this.associationTotalMap.delete(association);
        this.valueMap.delete(association);
    }

    /**
     * Check whether a given atomic key is associated
     * with a value in the map.
     * @param key Atomic key to check for
     * @returns Whether an associated value exists
     */
    public has(key: K): boolean {
        return this.associationMap.has(key);
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