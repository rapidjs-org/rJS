let routeHandlers = {
	get: [],
	post: []
};

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

            routeHandlers[method][pathname] && (output.log(`Redunant ${method.toUpperCase()} route handler set up for '${pathname}'`));

            routeHandlers[method][pathname] = {
                callback: callback,
                cachePermanently: cachePermanently,
                cached: null
            };
        },

        hasRoute: (method, pathname) => {
            return routeHandlers[method.toLowerCase()][pathname] ? true : false;
        },

        applyRoute: (method, pathname, args) => {
            // TODO: Make response object accessible to allow modification?
            let data;

            if (routeHandlers[method][pathname].cached) {
                data = routeHandlers[method][pathname].cached;
            } else {
                (args && !Array.isArray(args)) && (args = [args]);
                data = routeHandlers[method][pathname].callback.apply(null, args);

                routeHandlers[method][pathname].cachePermanently && (routeHandlers[method][pathname].cached = data);
            }

            return data;
        }
    }
};