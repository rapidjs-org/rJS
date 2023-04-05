import { Config } from "../Config";

import { ASharedLimitDictionary } from "./ASharedLimitDictionary";


/**
 * Class representing a purpuse-directed cache, i.e. a
 * time limited dicitionary data structure.
 */
export class Cache<K, V> extends ASharedLimitDictionary<K, V, number> {

    private readonly duration: number;
    
    constructor(duration: number = Config.main.get("cache", "server").number(), normalizeKeyCallback?: (key: K) => K) {
        super(normalizeKeyCallback);
        
        this.duration = duration;
    }

    /**
     * Implement abstract required reference value retrieval
     * represented by the current timestamp.
     * @returns Current UNIX timestamp (ms)
     */
    protected retrieveReferenceCallback(): number {
        return Date.now();
    }

    /**
     * Implement abstract required reference value retrieval
     * represented by the current timestamp.
     * @returns Current UNIX timestamp (ms)
     */
    protected validateLimitCallback(reference: number, current: number): boolean {
        return ((current - reference) <= this.duration);
    }

}