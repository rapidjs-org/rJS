const utils = require("./utils");

const urlMap = new Map();

/**
 * Check if the cache holds an entry for the requested URL (pathname as key).
 * Clears outdated entries implicitly resulting in a false return value.
 * @param {String} url URL key as in request
 * @param {Number} cacheRefreshFrequency Frequency of cache refreshing in ms
 * @returns {Boolean} Whether the cache holds an entry for the requested URL
 */
function has(url, cacheRefreshFrequency) {
	if(!urlMap.has(url)) {
		return false;
	}
	if((urlMap.get(url).time + cacheRefreshFrequency) < Date.now()) {
		urlMap.delete(url);
        
		return false;
	}

	return true;
}

/**
 * Read data associated with the given URL key from cache.
 * @param {String} url URL to get cached data value for
 * @returns {String|Buffer} Data
 */
function read(url) {
	return urlMap.get(url).data;
}

/**
 * Write given data to the cache associated with the provided URL key.
 * @param {String} url URL (pathname) key
 * @param {String|Buffer} data Data to write to cache
 */
function write(url, data) {
	urlMap.set(url, {
		time: Date.now(),
		data: data
	});
}

module.exports = {
	has,
	read,
	write
};