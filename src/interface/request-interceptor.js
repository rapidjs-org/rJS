const {isFunction} = require("../utils");

let requestInterceptorHandlers = [];

module.exports = {
	addRequestInterceptor: callback => {
		requestInterceptorHandlers.push(callback);
	},

	applyRequestInterceptors: req => {
		requestInterceptorHandlers.forEach(requestInterceptor => {
			isFunction(requestInterceptor) && requestInterceptor(req);
		});
	}
};