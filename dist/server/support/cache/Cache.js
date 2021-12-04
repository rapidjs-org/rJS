"use strict";
/**
 * @class
 * Class representing an independent cache to be utilized for preventing
 * redundant reading/processing costs as well as improving performance at
 * load peaks.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const config_server_1 = __importDefault(require("../../../config/config.server"));
// TODO: Generics?
class Cache {
    /**
     * Create an individual, closed cache object.
     * @param {Number} [duration] Caching duration in ms (as set in server config by default)
     */
    constructor(duration) {
        /**
         * Storage map to associate a normalized, unique key with response data.
         */
        this.storage = new Map();
        // Disable cache if duration value not greater than zero (or even NaN)
        this.duration = (!duration || isNaN(duration) || duration <= 0)
            ? null
            : config_server_1.default.cachingDuration.server;
    }
    /**
     * Normalize a given entry key.
     * @param {string} key Entry key
     * @returns {string} Normalized (unique) key
     */
    applyNormalizationCallback(key) {
        return this.normalizationCallback
            ? this.normalizationCallback(key)
            : key;
    }
    /**
     * Determine whether a certain entry exists in cache storage.
     * @param {string} key Normalized entry key
     * @returns {boolean} Whether the entry exists
     */
    isEmpty(key) {
        // Caching disabled
        if (!this.duration) {
            return true;
        }
        // Storage entry exists but has expired
        if ((this.storage.get(key).time + (this.duration || Infinity)) < Date.now()) {
            this.storage.delete(key);
            return true;
        }
        // Valid storage entry exists
        return false;
    }
    /**
     * Check if the cache holds an entry for the requested URL (pathname as key).
     * Clears outdated entries implicitly result g in a false return value.
     * @param {string} key Unique key
     * @returns {boolean} Whether the cache holds an entry for the requested URL
     */
    exists(key) {
        key = this.applyNormalizationCallback(key);
        return !this.isEmpty(key);
    }
    /**
     * Read data sequence associated with the given key from cache.
     * @param {string} key Entry key
     * @returns {string|Buffer} Cached data associated with the given key (undefined if not in cache)
     */
    read(key) {
        key = this.applyNormalizationCallback(key);
        return this.isEmpty(key)
            ? undefined
            : this.storage.get(key).data;
    }
    /**
     * Write a given data sequence to the cache in association with the provided URL key.
     * @param {string} key Entry key
     * @param {*} data Data to write to cache
     */
    write(key, data) {
        if (!this.duration) {
            return;
        }
        this.storage.set(key, {
            time: Date.now(),
            data: data
        });
    }
}
exports.Cache = Cache;
