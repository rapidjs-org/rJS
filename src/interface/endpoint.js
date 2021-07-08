const cache = require("../support/cache");

const {getPluginName, getCallerPath} = require("../utils");

const routeHandlers = new Map();

module.exports =  {
	/**
	 * Set up a custom route handler for a certain method.
	 * @param {String} method Name of method to bind route to
	 * @param {Function} callback Callback getting passed – if applicable – the request body object eventually returning the response data to be sent
	 * @param {Boolean} [useCache=false] Whether to cache the processed response using a server-side cache
	 */
	setEndpoint: (callback, useCache = false) => {
		const pathname = getPluginName(getCallerPath(__filename));

		routeHandlers.set(`/${pathname}`, {
			callback: callback,
			useCache: useCache
		});
		// TODO: Argument whether to apply related response modifiers to route handler response (false by default)
	},

	hasRoute: (pathname) => {
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