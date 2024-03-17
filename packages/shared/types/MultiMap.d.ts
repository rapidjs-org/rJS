export declare class MultiMap<K, T> {
    private readonly associationMap;
    private readonly valueMap;
    private entryCounter;
    private normalizeKeyArgument;
    private cleanValues;
    /**
     * Set a value to the map given an arbitrary, non-zero
     * integral amount of keys to associate with.
     * @param keyArgument Atomic key or array of keys to associate
     * @param value Common value
     */
    set(keyArgument: K | K[], value: T): void;
    /**
     * Get a value by atomic key.
     * @param key Atomic key associated with value
     * @returns Associated value
     */
    get(keyArgument: K | K[]): T;
    /**
     * Delete a value by atomic key.
     * @param key Atomic key associated with value
     */
    delete(keyArgument: K | K[]): boolean;
    /**
     * Check whether a given atomic key is associated
     * with a value in the map.
     * @param key Atomic key to check for
     * @returns Whether an associated value exists
     */
    has(keyArgument: K | K[]): boolean;
    clear(): void;
    /**
     * Get the size of the map depicting the number of
     * values existing tin the map.
     * @returns Size
     */
    size(): number;
    /**
     * Get keys as nested array of association related
     * key arrays.
     * @returns Array of related key arrays
     */
    keys(): K[][];
    forEach(callback: (value: T) => void): void;
}
//# sourceMappingURL=MultiMap.d.ts.map