const cache = require("./cache")();
const {getNameByPath} = require("./plugin-management");

const utils = require("../utils");

const routeHandlers = new Map();

module.exports =  {
	/**
	 * Set up the endpoint for the respective plug-in in order to enable client-server-communication functionality.
	 * @param {Function} callback Callback getting passed the request body object to be handled for creating and returning the response data
	 * @param {Boolean} [useCache=false] Whether to cache the processed response using the server-side cache
	 */
	set: (callback, useCache = false) => {
		const pluginName = getNameByPath(utils.getCallerPath(__filename));
		const pathname = `/${pluginName}`;
		
		if(routeHandlers.has(pathname)){
			throw new ReferenceError(`Overriding endpoint for plug-in with name '${pluginName}'`);
		}

		routeHandlers.set(pathname, {
			callback: callback,
			useCache: useCache
		});
	},

	has: (pathname) => {
		return routeHandlers.has(pathname) ? true : false;
	},

	use: (body, reducedRequestObject) => {
		const pathname = reducedRequestObject.pathname;
		
		if(routeHandlers.get(pathname).useCache && cache.has(pathname)) {
			return cache.read(pathname);
		}
		
		// TODO: Provide request location instead of endpoint URL in reduced req obj!
		
		const data = routeHandlers.get(pathname).callback.call(null, body, reducedRequestObject);
		routeHandlers.get(pathname).useCache && (cache.write(pathname, data));
		
		return data;
	}
};