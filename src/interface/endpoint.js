const cache = require("../support/cache");

const {getPluginName, getCallerPath} = require("../utils");

const routeHandlers = new Map();

module.exports =  {
	/**
	 * Set up the endpoint for the respective plug-in in order to enable client-server-communication functionality.
	 * @param {Function} callback Callback getting passed the request body object to be handled for creating and returning the response data
	 * @param {Boolean} [useCache=false] Whether to cache the processed response using the server-side cache
	 */
	setEndpoint: (callback, useCache = false) => {
		const pathname = getPluginName(getCallerPath(__filename));

		routeHandlers.set(`/${pathname}`, {
			callback: callback,
			useCache: useCache
		});
		// TODO: Argument whether to apply related response modifiers to route handler response (false by default)
	},

	hasEndpoint: (pathname) => {
		return routeHandlers.has(pathname) ? true : false;
	},

	applyEndpoint: (pathname, args) => {
		if(routeHandlers.get(pathname).useCache && cache.has(pathname)) {
			return cache.read(pathname);
		}
		
		(args && !Array.isArray(args)) && (args = [args]);

		const data = routeHandlers.get(pathname).callback.apply(null, args);
		routeHandlers.get(pathname).useCache && (cache.write(pathname, data));
		
		return data;
	}
};