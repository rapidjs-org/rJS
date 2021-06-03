const {isFunction} = require("../utils");

let requestInterceptorHandlers = [];

module.exports = {
	setRequestInterceptor: callback => {
		requestInterceptorHandlers.push(callback);
	},

	applyRequestInterceptor: req => {
		requestInterceptorHandlers.forEach(requestInterceptor => {
			isFunction(requestInterceptor) && requestInterceptor(req);
		});
	}
};