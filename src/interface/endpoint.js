const config = {
	defaultEndpointName: "::default"	// Must contain a plug-in name restricted character in order to prevent duplicate override
};


const utils = require("../utils");

const cache = require("./cache")();
const {getNameByPath} = require("./plugin-management");

const isDevMode = require("../support/is-dev-mode");

const entityHook = require("../server/entity-hook");


const routeHandlers = new Map();


/**
 * Set up the endpoint for the respective plug-in in order to enable client-server-communication functionality.
 * @param {Function} callback Callback getting passed the request body object to be handled for creating and returning the response data
 * @param {Boolean} [useCache=false] Whether to cache the processed response using the server-side cache
 * @param {String} [name=null] Endpoint name for identification if to define different endpoints for a single plug-in
 */
function set(callback, useCache, name) {
	const pluginName = getNameByPath(utils.getCallerPath(__filename));
	const pathname = `/${pluginName}`;

	const respectiveMap = routeHandlers.has(pathname)
		? routeHandlers.get(pathname)
		: new Map();

	if(!isDevMode && respectiveMap.has(pathname)){
		throw new ReferenceError(`Must not override already set up endpoint for plug-in with name '${pluginName}'`);
	}
	
	respectiveMap.set(name || config.defaultEndpointName, {
		callback: callback,
		useCache: useCache
	});
	
	routeHandlers.set(pathname, respectiveMap);
}


module.exports =  {
	setUnnamed: (callback, useCache = false) => {
		set(callback, useCache);
	},

	setNamed: (name, callback, useCache = false) => {
		set(callback, useCache, name);
	},

	has: (pathname) => {
		return routeHandlers.has(pathname);
	},

	use: (pathname, body, name) => {
		// Retrieve handler (from name if given, default or first otherwise)
		const routeHandler = routeHandlers.get(pathname);
		const pluginName = pathname.replace(/^\//, "");

		let handler;
		if(name) {
			handler = routeHandler.get(name);
			
			if(!handler) {
				throw new ReferenceError(`Endpoint for plug-in '${pluginName}' with name '${name}' does not exist`);
			}
		} else {
			handler = routeHandler.get(config.defaultEndpointName);
			handler = handler ? handler : ((routeHandler.size == 1) ? routeHandler.values().next().value : null);
			
			if(!handler) {
				throw new ReferenceError(`Endpoint for plug-in '${pluginName}' does not exist`);
			}
		}

		// Use cached response if enabled and stored accordingly
		const cacheKey = `${pluginName}${name}`;

		if(handler.useCache && cache.has(cacheKey)) {
			return cache.read(cacheKey);
		}
		
		/* const origLog = console.log;
		console.log = message => {
			process.stdout.write("Message from within endpoint:");
		}; */

		const reducedRequestObject = entityHook.reducedRequestObject();
		
		const data = handler.callback.call(null, body, reducedRequestObject);
		handler.useCache && (cache.write(cacheKey, data));
				
		/* console.log = origLog; */
		
		return data;
	}
};