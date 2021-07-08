const config = {
	pluginNamingPrefix: "rapidjs--"
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
		let name = sequence.toLowerCase().match(new RegExp(`(@[a-z0-9_-]+\\/)?${config.pluginNamingPrefix}([a-z0-9_-]+)`));
		if(name) {
			name = name[0].replace(new RegExp(`(^|\\/)${config.pluginNamingPrefix}`), "$1");
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
		return extension.trim().replace(/^\./, "").toLowerCase();
	},

	/**
	 * Inject a given sequence into a given hosting markup's head tag (top; only if head tag exists).
	 * @param {String} hostData Markup to inject a given sequence into
	 * @param {String} insertData Injection sequence
	 * @param {Boolean} [atBottom=false] Whether to insert sequence at bottom of head (at top otherwise)
	 * @returns {String} Injected host data
	 */
	injectIntoHead: (hostData, insertData, atBottom = false) => {
		const headTag = {
			open: hostData.match(/<\s*head((?!>)(\s|.))*>/),
			close: hostData.match(/<\s*\/head((?!>)(\s|.))*>/)
		};

		if(!headTag.open || !headTag.close) {
			return hostData;
		}
		
		return atBottom
			? hostData.replace(headTag.close[0], `${insertData}${headTag.close[0]}`)
			: hostData.replace(headTag.open[0], `${headTag.open[0]}${insertData}`);
	}

};