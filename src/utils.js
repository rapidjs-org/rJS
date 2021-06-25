const config = {
	plugInNamingPrefix: "rapidjs--"
};

const {dirname, basename} = require("path");

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
		let name = sequence.toLowerCase().match(new RegExp(`(@[a-z0-9_-]+\\/)?${config.plugInNamingPrefix}([a-z0-9_-]+)`));
		if(name) {
			name = name[0].replace(new RegExp(`(^|\\/)${config.plugInNamingPrefix}`), "$1");
		} else {
			name = basename(dirname(sequence));
		}
		
		return name;
	},
	
	isString: value => {
		return typeof value === "string" || value instanceof String;
	},
     
	isFunction: value => {
		return value && {}.toString.call(value) === "[object Function]";
	},
     
	isAsyncFunction: value => {
		return value.constructor.name === "AsyncFunction";
	},


	normalizeExtension: extension => {
		return extension.trim().replace(/^\./, "");
	}

};