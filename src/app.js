const server = require("./server");

const output = require("./interfaces/output");

// Init frontend base file to provide reusable methods among plug-ins
server.initFrontendModule(__dirname);

// Store identifiers of required modules from within plug-ins in order to prevent redundant loading
// processes (and overriding or adding functionality interference).
let requiredModules = new Set();

/**
 * Require a plug-in module on core level.
 * Redundant requifre calls of a specific plug-in module will be ignored.
 * @param {String} plugInName Plug-in module name
 */
function requirePlugin(plugInName) {
	const identifier = plugInName.match(/[a-z0-9@/._-]+$/i)[0];

	if(requiredModules.has(identifier)) {
		return;
	}

	try {
		require(plugInName)(module.exports());
	} catch(err) {
		output.error(err);

		// TODO: Auto-install plug-in dependecies if enabled in config (ask otherwise)
	}

	requiredModules.add(identifier);
}

/**
 * Create a custom cache object.
 * @param {Number} cacheRefreshFrequency 
 * @returns {Object} Cache object
 */
 function createCache(cacheRefreshFrequency) {
	return require("./support/cache")(cacheRefreshFrequency);
}

/**
 * Create rapid core instance.
 * @param {String[]} plugIns Array of plug-in names to use
 * @returns Core coreInterface object
 */
module.exports = plugIns => {
	const coreInterface = {
		...server,
		... {
			output,
			createCache,
			require: requirePlugin,
			
			addPathModifier: require("./interfaces/path-modifier").addPathModifier,
			setReader: require("./interfaces/reader").setReader,
			applyReader: require("./interfaces/reader").applyReader,
			addResponseModifier: require("./interfaces/response-modifier").addResponseModifier,
			applyResponseModifier: require("./interfaces/response-modifier").applyResponseModifier,
			setRoute: require("./interfaces/router").setRoute,
			setRequestInterceptor: require("./interfaces/request-interceptor").setRequestInterceptor
		}
	};

	(plugIns || []).forEach(name => {
		requirePlugin(name);
	});	// TODO: Handle/translate cryptic require errors
	
	return coreInterface;
};