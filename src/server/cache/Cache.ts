/**
 * @class
 * Class representing an independent cache to be utilized for preventing
 * redundant reading/processing costs as well as improving performance at
 * load peaks.
 */


import serverConfig from "../../config/config.server";

import isDevMode from "../../utilities/is-dev-mode";


interface IStorageObject<T> {
    time: number;
    data: T;
}


export abstract class Cache<T> {
    private readonly duration: number;
    /**
     * Storage map to associate a normalized, unique key with response data.
     */
    private readonly storage: Map<string, IStorageObject<T>> = new Map();
    /**
     * Normalization callback to be applied to given keys in order to prevent duplicate/dead entries.
     */
    protected normalizationCallback: (key: string) => string;

    /**
     * Create an individual, closed cache object.
     * @param {Number} [duration] Caching duration in ms (as set in server config by default)
     */
    constructor(duration?: number) {
    	// Disable cache if duration value not greater than zero (or even NaN)
    	this.duration = (!duration || isNaN(duration) || duration <= 0)
    		? null
    		: serverConfig.cachingDuration.server;
    }

    /**
     * Normalize a given entry key.
     * @param {string} key Entry key
     * @returns {string} Normalized (unique) key
     */
    private applyNormalizationCallback(key: string): string {
    	return this.normalizationCallback
    		? this.normalizationCallback(key)
    		: key;
    }

    /**
     * Determine whether a certain entry exists in cache storage.
     * @param {string} key Normalized entry key
     * @returns {boolean} Whether the entry exists
     */
    private isEmpty(key: string): boolean {
    	// Caching disabled
    	if(!this.duration) {
    		return true;
    	}
        
    	// Storage entry exists but has expired
    	if((this.storage.get(key).time + (this.duration || Infinity)) < Date.now()) {
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
    public exists(key: string): boolean {
    	if(isDevMode) {
    		// Always declare as empty in DEV MODE
    		return false;
    	}

    	key = this.applyNormalizationCallback(key);
        
    	return !this.isEmpty(key);
    }
    
    /**
     * Read data sequence associated with the given key from cache.
     * @param {string} key Entry key
     * @returns {string|Buffer} Cached data associated with the given key (undefined if not in cache)
     */
    public read(key: string): unknown {
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
    public write(key: string, data) {
    	if(!this.duration) {
    		return;
    	}

    	this.storage.set(key, {
    		time: Date.now(),
    		data: data
    	});
    }
}