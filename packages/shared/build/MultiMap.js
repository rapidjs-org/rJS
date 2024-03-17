export class MultiMap {
    constructor() {
        this.associationMap = new Map();
        this.valueMap = new Map();
        this.entryCounter = 0;
    }
    normalizeKeyArgument(keyArgument) {
        return [keyArgument].flat();
    }
    cleanValues() {
        this.valueMap
            .forEach((_, key) => {
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
    set(keyArgument, value) {
        const keys = this.normalizeKeyArgument(keyArgument);
        this.valueMap.set(++this.entryCounter, value);
        keys.forEach((key) => {
            this.associationMap.set(key, this.entryCounter);
        });
        this.cleanValues();
    }
    /**
     * Get a value by atomic key.
     * @param key Atomic key associated with value
     * @returns Associated value
     */
    get(keyArgument) {
        const keys = this.normalizeKeyArgument(keyArgument);
        for (const key of keys) {
            const association = this.associationMap.get(key);
            if (association)
                return this.valueMap.get(association);
        }
        return undefined;
    }
    /**
     * Delete a value by atomic key.
     * @param key Atomic key associated with value
     */
    delete(keyArgument) {
        const keys = this.normalizeKeyArgument(keyArgument);
        if (!keys.length)
            return false;
        const association = this.associationMap.get(keys[0]);
        if (!association)
            return false;
        if (keys.filter((key) => this.associationMap.get(key) !== association).length) {
            throw new SyntaxError("Attempt to delete multiple unrelated keys");
        }
        keys.forEach((key) => {
            this.associationMap.delete(key);
        });
        this.cleanValues();
        return this.valueMap.has(association);
    }
    /**
     * Check whether a given atomic key is associated
     * with a value in the map.
     * @param key Atomic key to check for
     * @returns Whether an associated value exists
     */
    has(keyArgument) {
        const keys = this.normalizeKeyArgument(keyArgument);
        for (const key of keys) {
            if (this.associationMap.has(key))
                return true;
        }
        return false;
    }
    clear() {
        this.associationMap.clear();
        this.valueMap.clear();
    }
    /**
     * Get the size of the map depicting the number of
     * values existing tin the map.
     * @returns Size
     */
    size() {
        return this.valueMap.size;
    }
    /**
     * Get keys as nested array of association related
     * key arrays.
     * @returns Array of related key arrays
     */
    keys() {
        const consolidatedMap = new Map();
        this.associationMap
            .forEach((internalReference, key) => {
            var _a;
            const keyArray = (_a = consolidatedMap.get(internalReference)) !== null && _a !== void 0 ? _a : [];
            keyArray.push(key);
            consolidatedMap.set(internalReference, keyArray);
        });
        return Array.from(consolidatedMap.values());
    }
    forEach(callback) {
        this.valueMap.forEach((value) => callback(value));
    }
}
