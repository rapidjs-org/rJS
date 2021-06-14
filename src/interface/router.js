const {normalize} = require("path");

const output = require("./output");

let routeHandlers = {
	get: [],
	post: []
};

module.exports = cache => {
	return {
		/**
		 * Set up a custom route handler for a certain method.
		 * @param {String} method Name of method to bind route to
		 * @param {String} pathname Pathname to bind route to
		 * @param {Function} callback Callback getting passed – if applicable – the request body object eventually returning the response data to be sent
		 * @param {Boolean} [useCache=false] Whether to cache the processed response using the server-side cache
		 */
		setRoute: (method, pathname, callback, useCache = false) => {
			method = String(method).trim().toLowerCase();

			if(!["get", "post"].includes(method)) {
				throw new SyntaxError(`${method.toUpperCase()} is not a supported HTTP method`);
			}

			pathname = normalize(pathname);

			routeHandlers[method][pathname] && (output.log(`Redunant ${method.toUpperCase()} route handler set up for '${pathname}'`));

			routeHandlers[method][pathname] = {
				callback: callback,
				useCache: useCache
			};

			// TODO: Argument whether to apply related response modifiers to route handler response (false by default)
		},

		hasRoute: (method, pathname) => {
			pathname = normalize(pathname);

			return routeHandlers[method.toLowerCase()][pathname] ? true : false;
		},

		applyRoute: (method, pathname, args) => {
			if(!routeHandlers[method] || !routeHandlers[method][pathname]) {
				throw new ReferenceError(`Route to be applied does not exist '${method}': '${pathname}'`);
			}

			pathname = normalize(pathname);

			let data;

			if(routeHandlers[method][pathname].useCache && cache.has(pathname)) {
				data = cache.read(pathname);
			} else {
				(args && !Array.isArray(args)) && (args = [args]);
				data = routeHandlers[method][pathname].callback.apply(null, args);

				routeHandlers[method][pathname].useCache && (cache.write(pathname, data));
			}

			return data || null;
		}
	};
};