const config = {
	plugInNamingPrefix: "rapid-"
};

const {dirname} = require("path");

module.exports = {

	getCallerPath: fileName => {
		const err = new Error();
		
		Error.prepareStackTrace = (_, stack) => {
			return stack;
		};

		while(fileName && err.stack.length) {
			const callerFile = err.stack.shift().getFileName();
			
			if(callerFile === fileName) {
				break;
			}
		}
		while(err.stack.length) {
			const callerFile = err.stack.shift().getFileName();
			
			if(callerFile !== fileName) {
				return dirname(callerFile);
			}
		}

		throw new SyntaxError("Failed to retrieve path to caller module");
	},
	
	getPluginName: sequence => {
		return sequence.toLowerCase().replace(new RegExp(`(^|\\/)${config.plugInNamingPrefix}`), "$1");
	},
	
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