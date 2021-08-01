const config = {
	compoundPageDirPrefix: ":",
	defaultFileName: "index"
};


const {join} = require("path");
const {existsSync} = require("fs");

const webPath = require("./support/web-path");
const output = require("./support/output");


function isString(value) {
	return typeof value === "string" || value instanceof String;
}
     
function isFunction(value) {
	return value && {}.toString.call(value) === "[object Function]";
}

module.exports = {
	
	isString,
	isFunction,

	createInterface: (func, scopeDefinition, terminateOnError = false) => {
		return (...args) => {
			try {
				return func.apply(null, args);
			} catch(err) {
				output.log(`An error occurred${scopeDefinition ? ` ${scopeDefinition}` : ""}:`);
				output.error(err, terminateOnError);
			}
		};
	},

	getCallerPath: fileName => {
		const err = new Error();
		
		Error.prepareStackTrace = (_, stack) => {
			return stack;
		};

		while(err.stack.length) {
			const callerFile = err.stack.shift().getFileName();
			
			if(callerFile !== (fileName || null) && callerFile !== __filename) {
				return callerFile;
			}
		}
		
		throw new SyntaxError("Failed to retrieve path to caller module");
	},

	normalizeExtension: extension => {
		if(!isString(extension)) {
			throw new ReferenceError(`Given extension of type ${typeof(extension)}, expecting type String instead`);
		}

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
	},

	createReducedRequestObject: entity => {
		// Construct reduced request object to be passed to each response modifier handler
		return {
			ip: entity.req.headers["x-forwarded-for"] || entity.req.connection.remoteAddress,
			lang: entity.url.lang,
			locale: entity.url.locale,
			pathname: entity.url.pathname,
			isCompound: entity.url.isCompound,
			... entity.url.isCompound
			? {
				base: entity.url.base,
				args: entity.url.args
			}
			: {}
		};
	},

	getPathInfo: (pathname) => {
		// Use compound page path if respective directory exists
		let compoundPath = "";
		const pathParts = pathname.replace(/^\//, "").split(/\//g) || [pathname];
		for(let part of pathParts) {
			// Construct possible internal compound path
			const localCompoundPath = join(compoundPath, `${config.compoundPageDirPrefix}${part}`, `${part}.html`);
			compoundPath = join(compoundPath, part);
			
			// Return compound path if related file exists in file system
			if(existsSync(join(webPath, localCompoundPath))) {
				const args = pathname.slice(compoundPath.length + 2)
							.split(/\//g)
							.filter(arg => arg.length > 0);
				
				return {
					isCompound: true,
					pathname: localCompoundPath,
					base: `/${compoundPath}`,
					args: args
				};
			}
		}
		// TODO: Store already obtained compound page paths mapped to request pathnames in order to reduce computing compexity (cache?)?
		
		// Add default file name if none explicitly stated in request URL
		pathname = `${pathname.replace(/\/$/, `/${config.defaultFileName}`)}`;
		pathname += ".html";
		
		return {
			isCompound: false,
			pathname: pathname
		}
	}

};