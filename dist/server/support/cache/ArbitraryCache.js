"use strict";
/**
 * @class
 * Class representing a cache for arbitrary keys.
 * The static normalization callback my be deployed individually.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbitraryCache = void 0;
const Cache_1 = require("./Cache");
class ArbitraryCache extends Cache_1.Cache {
    /**
     * Create an individual, closed cache object.
     * @param {number} [duration] Caching duration in ms (as set in server config by default)
     */
    constructor(duration) {
        super(duration);
    }
    /**
     * Set up optional entry key normalization callback.
     * @param {Function} callback Normalization callback getting passed an entry key to be normalized/unified.
     */
    setNormalization(callback) {
        this.normalizationCallback = callback;
    }
}
exports.ArbitraryCache = ArbitraryCache;
