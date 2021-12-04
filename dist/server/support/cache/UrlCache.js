"use strict";
/**
 * @class
 * Class representing a cache for URL keys.
 * Deploys a respective normalization callback implicitly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlCache = void 0;
const path_1 = require("path");
const Cache_1 = require("./Cache");
class UrlCache extends Cache_1.Cache {
    /**
     * Create an individual, closed cache object.
     * @param {Number} [duration] Caching duration in ms (as set in server config by default)
     */
    constructor(duration) {
        super(duration);
        this.normalizationCallback = (key) => {
            return (0, path_1.normalize)(key); // TODO: Enhance
        };
    }
}
exports.UrlCache = UrlCache;
