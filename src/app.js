const server = require("./server");
const coreInterface = {
	...server,
	... {
		createCache,
		require: requirePluginModule
	}
};

// Init frontend base file to provide reusable methods among plug-ins
server.initFrontendModule(__dirname);

// Store identifiers of required modules from within plug-ins in order to prevent redundant loading
// processes (and overriding or adding functionality interference).
let requiredModules = new Set();

/**
 * Create a custom cache object.
 * @param {Number} cacheRefreshFrequency 
 * @returns {Object} Cache object
 */
function createCache(cacheRefreshFrequency) {
	return require("./support/cache")(cacheRefreshFrequency);
}

/**
 * Require a plug-in module on core level.
 * Redundant requifre calls of a specific plug-in module will be ignored.
 * @param {String} plugInName Plug-in module name
 */
function requirePluginModule(plugInName) {
	const identifier = plugInName.match(/[a-z0-9@/._-]+$/i)[0];

	if(requiredModules.has(identifier)) {
		return;
	}

	try {
		require(plugInName)(module.exports());
	} catch(err) {
		console.error(err);

		// TODO: Auto-install plug-in dependecies if enabled in config (ask otherwise)
	}

	requiredModules.add(identifier);
}

/**
 * Create rapid core instance.
 * @param {String[]} plugIns Array of plug-in names to use
 * @returns Core coreInterface object
 */
module.exports = plugIns => {
	(plugIns || []).forEach(name => {
		require(name)(coreInterface);
	});
	
	return coreInterface;
};