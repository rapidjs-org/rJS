const cachingDuration = require("./is-dev-mode") ? null : require("./config").webConfig.cachingDuration.server;

const storage = new Map();

function checkEmpty(key, cachingDuration) {
	if(!cachingDuration) {
		return true;
	}

	if((storage.get(key).time + (cachingDuration || Math.infiniti)) < Date.now()) {
		storage.delete(key);
		
		return true;
	}

	return false;
}

function createCache() {
	return {
		/**
		 * Check if the cache holds an entry for the requested URL (pathname as key).
		 * Clears outdated entries implicitly result g in a false return value.
		 * @param {String} key Unique key
		 * @returns {Boolean} Whether the cache holds an entry for the requested URL
		 */
		has: key => {
			if(!storage.has(key)) {
				return false;
			}
			
			return !checkEmpty(key, cachingDuration);
		},

		/**
		 * Read data associated with the given URL key from cache.
		 * @param {String} key Unique key
		 * @returns {String|Buffer} Cached data associated with the given key (undefined if not in cache)
		 */
		read: key => {
			checkEmpty(key, cachingDuration);
			
			if(!storage.has(key)) {
				return undefined;
			}

			return storage.get(key).data;
		},

		/**
		 * Write given data to the cache associated with the provided URL key.
		 * @param {String} key Unique key
		 * @param {String|Buffer} data Data to write to cache
		 */
		write: (key, data) => {
			if(!cachingDuration) {
				return;
			}

			storage.set(key, {
				time: Date.now(),
				data: data
			});
		}
	};
}


module.exports = createCache();