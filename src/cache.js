const urlMap = new Map();

// Frequency of cache refreshing in ms (no refreshing if value is false)
let cacheRefreshFrequency;

/**
 * Check if the cache holds an entry for the requested URL (pathname as key).
 * Clears outdated entries implicitly resulting in a false return value.
 * @param {String} key Unique key (normalize URLs)
 * @returns {Boolean} Whether the cache holds an entry for the requested URL
 */
function has(url) {
	if(!urlMap.has(url)) {
		return false;
	}
	if(cacheRefreshFrequency && (urlMap.get(url).time + cacheRefreshFrequency) < Date.now()) {
		urlMap.delete(url);
        
		return false;
	}

	return true;
}

/**
 * Read data associated with the given URL key from cache.
 * @param {String} key Unique key (normalize URLs)
 * @returns {String|Buffer} Data
 */
function read(url) {
	return urlMap.get(url).data;
}

/**
 * Write given data to the cache associated with the provided URL key.
 * @param {String} key Unique key (normalize URLs)
 * @param {String|Buffer} data Data to write to cache
 */
function write(url, data) {
	urlMap.set(url, {
		time: Date.now(),
		data: data
	});
}

module.exports = refreshFrequency => {
	cacheRefreshFrequency = refreshFrequency;

	return {
		has,
		read,
		write
	};
};