const {exec} = require("child_process");

module.exports = {
	
	isString: value => {
		return typeof value === "string" || value instanceof String;
	},
     
	isFunction: value => {
		return value && {}.toString.call(value) === "[object Function]";
	},

	normalizeExtension: extension => {
		return extension.trim().replace(/^\./, "");
	}

};