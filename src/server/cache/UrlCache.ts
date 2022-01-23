/**
 * @class
 * Class representing a cache for URL keys.
 * Deploys a respective normalization callback implicitly.
 */


import {normalize as normalizeUrl} from "path";

import {Cache} from "./Cache";


export class UrlCache<T> extends Cache<T> {
    protected normalizationCallback = (key: string): string => {
    	return normalizeUrl(key);
    };

    /**
     * Create an individual, closed cache object.
     * @param {Number} [duration] Caching duration in ms (as set in server config by default)
     */
    constructor(duration?: number) {
    	super(duration);
    }
}