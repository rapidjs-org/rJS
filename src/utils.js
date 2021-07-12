const {dirname, extname, join} = require("path");
const {existsSync} = require("fs");

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
				return callerFile;
			}
		}

		throw new SyntaxError("Failed to retrieve path to caller module");
	},
	
	getPluginName: sequence => {
		// Installed plug-in by package (package name / name as given)
		if(!/^((\.)?\.)?\//.test(sequence)) {
			return sequence;
		}
		if(/^(\.)?\.\//.test(sequence)) {
			sequence = join(dirname(require.main.filename), sequence);
		}

		sequence = sequence.replace(/(\/src)?\/app(\.js)?$/, "");
		
		const packagePath = join(sequence, "package.json");

		// TODO: Package up until found (check for entry point equality)?
		
		// TODO: App name directive file (if un-packaged)

		const name = existsSync(packagePath) ? require(packagePath).name : null;
		if(!name) {
			// Local plug-in without (or without named) package (file name (without extension) / name as given)
			const extensionLength = extname(sequence).length;
			return (extensionLength > 0) ? sequence.slice(0, -extensionLength) : sequence;
		}

		// Local plug-in with named package (retrieve package name)
		return name;
	},
	
	isString: value => {
		return typeof value === "string" || value instanceof String;
	},
     
	isFunction: value => {
		return value && {}.toString.call(value) === "[object Function]";
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