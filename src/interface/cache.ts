/**
 * Cache creation interface.
 */


import {ArbitraryCache as Cache} from "../server/support/cache/ArbitraryCache";

import {wrapInterface} from "./wrapper";


/**
 * Create a dedicated cache instance.
 * @param {number} [duration] Caching duration in ms (as set in server config by default)
 * @returns {Function} Cache instanciation wrapper function
 */
export function createCache(duration?: number) {
	return wrapInterface((): Cache<unknown> => {
		return new Cache(duration);
	}, "creating a dedicated cache");
}