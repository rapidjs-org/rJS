const {normalize} = require("path");

let routeHandlers = {
	get: [],
	post: []
};

function normalizePath(pathname) {
	return normalize(pathname);
}

module.exports = output => {
	return {
		/**
         * Set up a custom route handler for a certain method.
         * @param {String} method Name of method to bind route to
         * @param {String} pathname Pathname to bind route to
         * @param {Function} callback Callback getting passed – if applicable – the request body object eventually returning the response data to be sent
         * @param {Boolean} [cachePermanently=false] Whether to cache the processed response permanently 
         */
		setRoute: (method, pathname, callback, cachePermanently = false) => {
			method = String(method).trim().toLowerCase();

			if(!["get", "post"].includes(method)) {
				throw new SyntaxError(`${method.toUpperCase()} is not a supported HTTP method`);
			}

			pathname = normalizePath(pathname);

			routeHandlers[method][pathname] && (output.log(`Redunant ${method.toUpperCase()} route handler set up for '${pathname}'`));

			routeHandlers[method][pathname] = {
				callback: callback,
				cachePermanently: cachePermanently,	// TODO: Only in prod mode
				cached: null
			};

			// TODO: Argument whether to apply related response modifiers to route handler response (false by default)
		},

		hasRoute: (method, pathname) => {
			pathname = normalizePath(pathname);

			return routeHandlers[method.toLowerCase()][pathname] ? true : false;
		},

		applyRoute: (method, pathname, args) => {
			if(!routeHandlers[method] || !routeHandlers[method][pathname]) {
				throw new ReferenceError(`Route to be applied does not exist '${method}': '${pathname}'`)
			}

			pathname = normalizePath(pathname);

			let data;

			if(routeHandlers[method][pathname].cached) {
				data = routeHandlers[method][pathname].cached;
			} else {
				(args && !Array.isArray(args)) && (args = [args]);
				data = routeHandlers[method][pathname].callback.apply(null, args);

				routeHandlers[method][pathname].cachePermanently && (routeHandlers[method][pathname].cached = data);
			}

			return data || null;
		}
	};
};