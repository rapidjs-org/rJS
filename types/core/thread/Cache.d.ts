export const __esModule: boolean;
/**
 * Class representing a purpuse-directed cache, i.e. a
 * time limited dicitionary data structure.
 */
export class Cache extends ASharedLimitDictionary_1.ASharedLimitDictionary {
    constructor(duration: number, normalizeKeyCallback: any);
    duration: number;
    /**
     * Implement abstract required reference value retrieval
     * represented by the current timestamp.
     * @returns Current UNIX timestamp (ms)
     */
    retrieveReferenceCallback(): number;
    /**
     * Implement abstract required reference value retrieval
     * represented by the current timestamp.
     * @returns Current UNIX timestamp (ms)
     */
    validateLimitCallback(reference: any, current: any): boolean;
}
import ASharedLimitDictionary_1 = require("./ASharedLimitDictionary");
