const config = {
	pluginFrontendModuleName: "frontend",
	pluginNamingPrefix: "rapidjs--"
};

const {dirname, basename, extname, join} = require("path");
const {existsSync} = require("fs");

module.exports = {

	pluginFrontendModuleName: config.pluginFrontendModuleName,
	
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
			return removeNamingPrefix(sequence);
		}
		if(/^(\.)?\.\//.test(sequence)) {
			sequence = join(dirname(require.main.filename), sequence);
		}

		sequence = sequence.replace(/(\/src)?\/app(\.js)?$/, "");
		
		// Local plug-in without (named) package (file name (without extension) / name as given)
		const packagePath = join(sequence, "package.json");

		// TODO: Package up until found (check for entry point equality)

		const name = existsSync(packagePath) ? require(packagePath).name : null;
		if(!name) {
			(existsSync(join(dirname(sequence), `${config.pluginFrontendModuleName}.js`))) && (sequence = dirname(dirname(sequence)));
			sequence = basename(sequence);
			
			const extensionLength = extname(sequence).length;
			return removeNamingPrefix((extensionLength > 0) ? sequence.slice(0, -extensionLength) : sequence);
		}

		// Local plug-in by package (retrieve package name)
		return removeNamingPrefix(name);

		function removeNamingPrefix(name) {
			return name.replace(config.pluginNamingPrefix, "");
		}
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