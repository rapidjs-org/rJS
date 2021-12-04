"use strict";
/**
 * Cache creation interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCache = void 0;
const ArbitraryCache_1 = require("../server/support/cache/ArbitraryCache");
const wrapper_1 = require("./wrapper");
/**
 * Create a dedicated cache instance.
 * @param {number} [duration] Caching duration in ms (as set in server config by default)
 * @returns {Function} Cache instanciation wrapper function
 */
function createCache(duration) {
    return (0, wrapper_1.wrapInterface)(() => {
        return new ArbitraryCache_1.ArbitraryCache(duration);
    }, "creating a dedicated cache");
}
exports.createCache = createCache;
