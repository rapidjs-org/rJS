const {isFunction} = require("../utils");

let requestInterceptorHandler;

module.exports = {
	setRequestInterceptor: callback => {
		requestInterceptorHandler = callback;
	},
	
	applyRequestInterceptors: req => {
		isFunction(requestInterceptorHandler) && requestInterceptorHandler(req);
	}
};