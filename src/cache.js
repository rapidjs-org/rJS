const storage = new Map();

// Frequency of cache refreshing in ms (no refreshing if value is false)
let _cacheRefreshFrequency;

/**
 * Check if the cache holds an entry for the requested URL (pathname as key).
 * Clears outdated entries implicitly resulting in a false return value.
 * @param {String} key Unique key (normalize URLs)
 * @returns {Boolean} Whether the cache holds an entry for the requested URL
 */
function has(key) {
	if(!storage.has(key)) {
		return false;
	}
	if(_cacheRefreshFrequency && (storage.get(key).time + (_cacheRefreshFrequency || Math.infiniti)) < Date.now()) {
		storage.delete(key);
        
		return false;
	}

	return true;
}

/**
 * Read data associated with the given URL key from cache.
 * @param {String} key Unique key (normalize URLs)
 * @returns {String|Buffer} Data
 */
function read(key) {
	if(!storage.has(key)) {
		return undefined;
	}

	return storage.get(key).data;
}

/**
 * Write given data to the cache associated with the provided URL key.
 * @param {String} key Unique key (normalize URLs)
 * @param {String|Buffer} data Data to write to cache
 */
function write(key, data) {
	if(_cacheRefreshFrequency == 0) {
		return;
	}

	storage.set(key, {
		time: Date.now(),
		data: data
	});
}

module.exports = cacheRefreshFrequency => {
	_cacheRefreshFrequency = cacheRefreshFrequency;

	return {
		has,
		read,
		write
	};
};