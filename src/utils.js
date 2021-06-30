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
	},

	/**
	 * Inject a given sequence into a given hosting markup's head tag (top; only if head tag exists).
	 * @param {String} hostData Markup to inject a given sequence into
	 * @param {String} insertData Injection sequence
	 * @returns {String} Injected host data
	 */
	injectIntoHead: (hostData, insertData) => {
		const openingHeadTag = hostData.match(/<\s*head((?!>)(\s|.))*>/);
		if(!openingHeadTag) {
			return hostData;
		}

		return hostData.replace(openingHeadTag[0], `${openingHeadTag[0]}${insertData}`);
	}

};