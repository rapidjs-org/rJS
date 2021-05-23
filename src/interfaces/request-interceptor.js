const {isFunction} = require("../utils");

let requestInterceptor;

module.exports = {
	setRequestInterceptor: callback => {
        requestInterceptor = callback;
    },

    applyRequestInterceptor: req => {
        isFunction(requestInterceptor) && requestInterceptor(req);
    }
};