const cacheRefreshFrequency = require("./is-dev-mode") ? null : require("./config").webConfig.cacheRefreshFrequency.server;

const storage = new Map();

function checkEmpty(key, cacheRefreshFrequency) {
	if(!cacheRefreshFrequency) {
		return true;
	}

	if((storage.get(key).time + (cacheRefreshFrequency || Math.infiniti)) < Date.now()) {
		storage.delete(key);
		
		return true;
	}

	return false;
}

module.exports = {
	/**
	 * Check if the cache holds an entry for the requested URL (pathname as key).
	 * Clears outdated entries implicitly resulting in a false return value.
	 * @param {String} key Unique key (normalize URLs)
	 * @returns {Boolean} Whether the cache holds an entry for the requested URL
	 */
	has: key => {
		if(!storage.has(key)) {
			return false;
		}
		
		return !checkEmpty(key, cacheRefreshFrequency);
	},

	/**
	 * Read data associated with the given URL key from cache.
	 * @param {String} key Unique key (normalize URLs)
	 * @returns {String|Buffer} Cached data associated with the given key (undefined if not in cache)
	 */
	read: key => {
		checkEmpty(key, cacheRefreshFrequency);
		
		if(!storage.has(key)) {
			return undefined;
		}

		return storage.get(key).data;
	},

	/**
	 * Write given data to the cache associated with the provided URL key.
	 * @param {String} key Unique key (normalize URLs)
	 * @param {String|Buffer} data Data to write to cache
	 */
	write: (key, data) => {
		if(!cacheRefreshFrequency) {
			return;
		}

		storage.set(key, {
			time: Date.now(),
			data: data
		});
	}
};