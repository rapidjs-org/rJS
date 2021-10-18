const config = {
	compoundPageDirPrefixes: [":", "#"],	// TODO: Deprecate colon in future
	defaultFileName: "index"
};


const {join} = require("path");
const {existsSync} = require("fs");

const webPath = require("./support/web-path");
const output = require("./support/output");


const gatheredUrlInfo = new Map();


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

	adaptUrl: entity => {
		// Add default file name if none explicitly stated in request URL
		const pathname = entity.url.pathname
			.replace(/\/$/, `/${config.defaultFileName}`)
			.replace(/^\//, "");
		
		if(gatheredUrlInfo.has(pathname)) {
			entity.url = gatheredUrlInfo.get(pathname);
			
			return;
		}
		
		const localConventionalPath = pathname.replace(/(\.html)?$/, ".html");
		if(existsSync(join(webPath, localConventionalPath))) {
			return formEntity({
				pathname: `/${localConventionalPath}`
			}, false);
		}

		// Use compound page path if respective directory exists
		const pathParts = [""].concat(pathname.split(/\//g)
				|| [pathname]);
		
		const args = [];
		
		while(pathParts.length > 0) {
			// Construct possible compound path information to check for existence
			const part = pathParts.pop();

			for(let i = 0; i < config.compoundPageDirPrefixes.length; i++) {	// TODO: Remove when deprecated colon for indication
				const localCompoundPath = {
					index: join(pathParts.join("/"), part, `${config.compoundPageDirPrefixes[i]}${config.defaultFileName}`, `${config.defaultFileName}.html`),
					specific: join(pathParts.join("/"), `${config.compoundPageDirPrefixes[i]}${part}`, `${part}.html`)
				};
								
				let activeLocalCompoundPath;
				existsSync(join(webPath, localCompoundPath.index))
				&& (activeLocalCompoundPath = localCompoundPath.index);

				(!activeLocalCompoundPath && existsSync(join(webPath, localCompoundPath.specific)))
				&& (activeLocalCompoundPath = localCompoundPath.specific);
				
				if(!activeLocalCompoundPath) {
					continue;
				}

				// Return compound path if related file exists in file system
				return formEntity({
					pathname: `/${activeLocalCompoundPath}`,
					base: `/${join(pathParts.join("/"), part)}`,
					args: args.filter(arg => arg.length > 0).reverse()
				}, true);
			}

			args.push(part);
		}
		
		throw new ReferenceError(`Requested file not found '${pathname}'`);


		function formEntity(obj, isCompound) {
			const urlEntity = {
				...entity.url,
				...obj,

				isCompound: isCompound
			};

			// Store gathered URL info for future use
			gatheredUrlInfo.set(pathname, urlEntity);

			// Store to current entity obj
			entity.url = urlEntity;
		}
	}

};