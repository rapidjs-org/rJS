/**
 * @class
 * Class representing a cache for arbitrary keys.
 * The static normalization callback my be deployed individually.
 */


import { Cache } from "./Cache";


export class ArbitraryCache<T> extends Cache<T> {
	/**
     * Create an individual, closed cache object.
     * @param {number} [duration] Caching duration in ms (as set in server config by default)
     */
	constructor(duration?: number) {
		super(duration);
	}
	
	/**
     * Set up optional entry key normalization callback.
     * @param {Function} callback Normalization callback getting passed an entry key to be normalized/unified.
     */
	public normalize(callback: (key: string) => string) {
		this.normalizationCallback = callback;
	}
}