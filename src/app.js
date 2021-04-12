/**
 * Copyright (c) Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

// Local config
const config = {
	configFileName: {
		default: "default.config.json",
		custom: "rapid.config.json"
	},
	defaultFileName: "index",
	devModeArgument: "dev",
	dynamicPageDirPrefix: ":",
	featureNamingPrefix: "rapid-",
	frontendModuleAppName: "RAPID",
	frontendModuleReferenceName: {
		external: "module",
		internal: "_rapid"
	},
	mimesFileName: {
		default: "default.mimes.json",
		custom: "rapid.mimes.json"
	},
	nonStandaloneFilePrefix: "_",
	webDirName: "web"
};

const {existsSync, readFileSync} = require("fs");
const {extname, join, dirname, basename} = require("path");
const {parse: parseUrl} = require("url");

const WEB_PATH = join(require.main.path, config.webDirName);

const utils = require("./utils");
const rateLimiter = require("./rate-limiter");

// Read config files (general configuration, MIMES)
/**
 * Read a custom configuration file and merge it (overriding) with the default configuration file.
 * @returns {Object} Resulting configuration object
 */
const readConfigFile = (webPath, defaultName, customName) => {
	const defaultFile = require(`./${defaultName}`);
	const customFilePath = join(dirname(webPath), customName);
	if(!existsSync(customFilePath)) {
		return defaultFile;
	}
	const customFile = require(customFilePath);
	
	return {...defaultFile, ...customFile};
};

const webConfig = readConfigFile(WEB_PATH, config.configFileName.default, config.configFileName.custom);
const mimeTypes = readConfigFile(WEB_PATH, config.mimesFileName.default, config.mimesFileName.custom);
if(process.argv[2] && process.argv[2] == config.devModeArgument) {
	// Enable DEV-mode when related argument passed on application start
	webConfig.devMode = true;
}

const cache = {
	dynamic: require("./cache")(webConfig.cacheRefreshFrequency),
	static: require("./cache")(),	// Never read static files again as they wont change
};
const log = require("./log")(webConfig.verbouse);

const http = require(webConfig.useHttps ? "https" : "http");

// Request reader, finisher and custom method handler objects
let readerHandlers = {};
let finisherHandlers = {};
let routeHandlers = {
	get: [],
	post: []
};

function logError(err) {
	log("An internal server error occured:");
	console.error(err);
}

/**
 * Perform a redirect to a given path.
 * @param {Object} res - Open response object
 * @param {String} path - Path to redirect to
 */
function redirect(res, path) {
	res.setHeader("Location", path);
	
	respond(res, 301);
}

/**
 * Perform a redirect to a related error page.
 * @param {Object} res - Open response object
 * @param {String} status - Error status code
 * @param {String} path - Path of the requested page resulting in the error
 */
function redirectErrorPage(res, status, path) {
	do {
		path = dirname(path);
		let errorPagePath = join(path, String(status));
		if(existsSync(`${join(WEB_PATH, errorPagePath)}.html`)) {
			redirect(res, errorPagePath);
            
			return;
		}
	} while(path != "/");

	// Simple response if no related error page found
	respond(res, status);
}

/**
 * Perform a response.
 * @param {Object} res Open response object
 * @param {*} status Status code to use
 * @param {*} message Message to use
 */
function respond(res, status, message) {
	// Retrieve default message of status code if none given
	!message && (message = http.STATUS_CODES[status] || "");
    
	res.statusCode = status;

	if(!utils.isString(message) && !Buffer.isBuffer(message)) {
		message = JSON.stringify(message);
	}
    
	res.setHeader("Content-Length", Buffer.byteLength(message));
	
	res.end(message);
}

/**
 * Respond by a simple response or redirecting to an error page depending on the request method.
 * @helper
 * @param {Number} status Status code
 */
function respondProperly(res, method, pathname, status) {
	if(method.toLowerCase() == "get" && ["html", ""].includes(extname(pathname).slice(1).toLowerCase())) {
		redirectErrorPage(res, status, pathname);

		return;
	}

	respond(res, status);
}

/**
 * Handle a single request.
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function handleRequest(req, res) {
	// Block request if maximum 
	if(rateLimiter.mustBlock(req.connection.remoteAddress, webConfig.maxRequestsPerMin)) {
		res.setHeader("Retry-After", 30000);
		respondProperly(res, req.method, req.url, 429);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(req.url.length > webConfig.maxUrlLength) {
		respondProperly(res, req.method, req.url, 414);

		return;
	}
	// Block request if method is not handled
	const method = req.method.toLowerCase();
	if(!["get", "post"].includes(method)) {
		respond(res, 405);

		return;
	}
	// Redirect requests explicitly stating the default file or extension name to a request with an extensionless URL
	const urlParts = parseUrl(req.url, true);
	let explicitBase;
	if((explicitBase = urlParts.pathname.match(new RegExp(`\\/(${config.defaultFileName})?(\\.html)?$`)))
		&& explicitBase[0].length > 1) {
		const newUrl = urlParts.pathname.replace(explicitBase, "")
                     + (urlParts.search || "");
        
		redirect(res, newUrl);

		return;
	}

	// Set basic response headers
	webConfig.useHttps && (res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	res.setHeader("X-XSS-Protection", "1");
	res.setHeader("X-Content-Type-Options", "nosniff");

	// Apply the related handler
	if(method == "get") {
		handleGET(res, urlParts.pathname);

		return;
	} 
	if(method == "post") {
		handlePOST(req, res, urlParts.pathname);
        
		return;
	}
}

/**
 * Handle a GET request accordingly.
 * @param {Object} res Active response object
 * @param {String} pathname URL pathname part<<
 */
function handleGET(res, pathname) {
	let data;

	// Stripe dynamic argument part fom pathname
	pathname = pathname.replace(new RegExp(`(\\${config.dynamicPageDirPrefix}[a-z0-9_-]+)+`, "i"), "");

	if(routeHandlers.get[pathname]) {
		// Use custom GET route if defined on pathname as of higher priority
		try {
			if(routeHandlers.get[pathname].cached) {
				data = routeHandlers.get[pathname].cached;
			} else {
				data = routeHandlers.get[pathname].callback(res);

				routeHandlers.get[pathname].cachePermanently && (routeHandlers.get[pathname].cached = data);
			}
			
			respond(res, 200, data);
		} catch(err) {
			// Respond with status thrown (if is a number) or expose an internal error otherwise
			respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);
		}

		return;
	}

	let extension = extname(pathname).slice(1);

	const mime = mimeTypes[(extension.length > 0) ? extension : "html"];
	
	// Block request if blacklist enabled but requested extension blacklisted
	// or a dynamic page related file has been explixitly requested (restricted)
	// or a non-standalone file has been requested
	if(extension.length > 0 && webConfig.extensionBlacklist && webConfig.extensionBlacklist.includes(extension)
    || (new RegExp(`.*\\/${config.dynamicPageDirPrefix}.+`)).test(pathname)
	|| (new RegExp(`^${config.nonStandaloneFilePrefix}.+$`)).test(basename(pathname))) {
		respondProperly(res, "get", pathname, 403);

		return;
	}

	mime && res.setHeader("Content-Type", mime);

	// Retrieve correct cache
	let relatedCache;
	if(["", "html"].includes(extension)) {
		relatedCache = cache.dynamic;
	} else {
		relatedCache = cache.static;
	}

	if(relatedCache.has(pathname)) {
		// Read data from cache if exists (and not outdated)
		respond(res, 200, relatedCache.read(pathname));

		return;
	}

	let localPath = join(WEB_PATH, pathname);

	if(localPath.slice(-1) == "/") {
		// Add default file name if none explicitly stated in the request URL
		localPath += config.defaultFileName;
	}
	if(extension.length == 0) {
		// Check if dynamic page setup corresponding to the request URL exists in file system
		const localPathDynamic = join(dirname(localPath), config.dynamicPageDirPrefix + basename(localPath), `${basename(localPath)}.html`);
		if(existsSync(localPathDynamic)) {
			// Use dynamic page root file path for further processing
			localPath = localPathDynamic;

			// Stop processing as request has already been closed due to handler exception
			if(dynamicClose()) {
				return;
			}
		} else {
			// Add default extension if none explicitly stated in the request URL
			localPath += ".html";

			extension = "html";
		}
	}

	if(!existsSync(localPath)) {
		// Redirect to the related error page if requested file does not exist
		respondProperly(res, "get", pathname, 404);

		return;
	}

	// Read file either by custom reader handler or by default reader
	try {
		data = read(extension, localPath);
	} catch(err) {
		if(err !== 1) {
			log(err);
						
			respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);

			return;
		}

		data = readFileSync(localPath);
	}
	
	// Sequentially apply defined finishers (dynamic pages without extension use both empty and default extension handlers)
	try {
		data = finish(extension, data, localPath);
	} catch(err) {
		log(err);
		
		respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);
	}

	// Set client-side cache control for static files too
	(extension != "html") && (res.setHeader("Cache-Control", `max-age=${(webConfig.devMode ? null : (webConfig.cacheRefreshFrequenc / 1000))}`));
	
	// Set server-side cache
	relatedCache.write(pathname, data);

	respond(res, 200, Buffer.from(data, "UTF-8"));

	/**
	 * Apply dynamic handler to check if the request is closed dynamically.
	 * @helper
	 * @returns {Boolean} Whether to end the processing as performing a redirect
	 */
	function dynamicClose() {
		const handlerFilePath = join(dirname(localPath), `${basename(localPath).slice(0, -config.defaultFileName.length)}.js`);
		if(!existsSync(handlerFilePath)) {
			return false;
		}

		// Load handler file as module returning the templating object
		try {
			require(handlerFilePath);
		} catch(err) {
			if(err === 200) {
				return;
			}

			respondProperly(res, "get", localPath, isNaN(err) ? 404 : err);

			return true;
		}
		
		return false;
	}
}

/**
 * Handle a POST request accordingly.
 * @param {Object} req Active request object
 * @param {Object} res Active response object
 * @param {String} pathname URL pathname part
 */
function handlePOST(req, res, pathname) {
	if(!routeHandlers.post[pathname]) {
		// Block request if no related POST handler defined
		respond(res, 404);

		return;
	}

	let blockBodyProcessing;
	let body = [];
	req.on("data", chunk => {
		body.push(chunk);

		const bodyByteSize = (JSON.stringify(JSON.parse(body)).length * 8);
		if(bodyByteSize > webConfig.maxPayloadBytes) {
			// Block request if request payload is exceeds maximum size as put in web config
			blockBodyProcessing = true;

			respond(res, 413);
		}
	});
	req.on("end", _ => {
		if(blockBodyProcessing) {
			// Ignore further processing as maximum payload has been exceeded
			return;
		}
        
		if(body.length == 0) {
			body = null;
		} else {
			body = JSON.parse(body);
		}

		try {
			let data;
			if(routeHandlers.post[pathname].cached) {
				data = routeHandlers.post[pathname].cached;
			} else {
				data = routeHandlers.post[pathname].callback(body, res);

				routeHandlers.post[pathname].cachePermanently && (routeHandlers.post[pathname].cached = data);
			}

			respond(res, 200, JSON.stringify(data));
		} catch(err) {
			respond(res, isNaN(err) ? 500 : err);

			isNaN(err) && logError(err);
		}
	});
	req.on("error", _ => {
		respond(res, 500);
	});
}

/**
 * Set up a handler to read each GET request response data in of a certain file extension in a specific manner (instead of using the default reader).
 * By nature of a reading process only one reader handler may be set per extension (overriding allowed).
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed the the associated pathname. Throwing an error code leads to a related response.
 */
// TODO: Permanent cache option?
function reader(extension, callback) {
	extension = extension.trim().replace(/^\./, "");

	if(["", "html"].includes(extension)) {
		// Default markup file extensions may not be read custom
		log("Default markup files may not be read custom {'', 'html'}");

		return;
	}

	!readerHandlers[extension] && (readerHandlers[extension] = []);
	
	readerHandlers[extension] = callback;
}

/**
 * Call reader for a specific extension.
 * @param {String} extension Extension name
 * @param {String} pathname Pathname of request
 * @returns {*} Finished data
 */
function read(extension, pathname) {
	if(!utils.isFunction(readerHandlers[extension])) {
		throw 1;
	}

	return readerHandlers[extension](pathname);
}

/**
 * Set up a handler to finish each GET request response data of a certain file extension in a specific manner.
 * Multiple finisher handlers may be set up per extension to be applied in order of setup.
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed the data string to finish and the associated pathname returning the eventually send response data. Throwing an error code leads to a related response.
 */
function finisher(extension, callback) {
	extension = extension.trim().replace(/^\./, "");

	!finisherHandlers[extension] && (finisherHandlers[extension] = []);
	
	finisherHandlers[extension].push(callback);
}

/**
 * Call finisher for a specific extension.
 * @param {String} extension Extension name
 * @param {String} data Data to finish
 * @param {String} [pathname] Pathname of request
 * @returns {*} Finished data
 */
function finish(extension, data, pathname) {
	let definedFinishHandlers = (finisherHandlers[extension] || []).concat((finisherHandlers["html"] && extension.length == 0) ? finisherHandlers["html"] : []);
	definedFinishHandlers.forEach(finisher => {
		data = finisher(String(data), pathname);
	});

	return data;
}

/**
 * Set up a custom route handler for a certain method.
 * @param {String} method Name of method to bind route to
 * @param {String} pathname Pathname to bind route to
 * @param {Function} callback Callback getting passed the response object and – if applicable – the request's body object returning the eventually send response data
 * @param {Boolean} [cachePermanently=false] Whether to cache the processed response permanently 
 */
function route(method, pathname, callback, cachePermanently = false) {
	method = String(method).trim().toLowerCase();

	if(!["get", "post"].includes(method)) {
		throw new SyntaxError(`${method.toUpperCase()} is not a supported HTTP method`);
	}

	routeHandlers[method][pathname] && (log(`Redunant ${method.toUpperCase()} route handler set up for '${pathname}'`));

	routeHandlers[method][pathname] = {
		callback: callback,
		cachePermanently: cachePermanently,
		cached: null
	};
}

/**
 * Get the web file path on disc.
 * @returns {String} Web file path
 */
function webPath() {
	return WEB_PATH;
}

/**
 * Get a value from the config object.
 * @param {String} key Key name
 * @returns {*} Associated value if defined
 */
function getFromConfig(key) {
	return webConfig[key];
}

/**
 * Initialize frontend for a feature.
 * @param {String} featureDirPath Path to feature directory
 * @param {Object} featureConfig Config object of feature
 */
function initFeatureFrontend(featureDirPath, featureConfig) {
	const featureName = basename(dirname(featureDirPath)).toLowerCase().replace(new RegExp(`^${config.featureNamingPrefix}`), "");
	
	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	let frontendModuleData;
	let frontendFilePath = join(featureDirPath, "frontend.js");
	if(!existsSync(frontendFilePath)) {
		return;
	}

	frontendModuleData = String(readFileSync(frontendFilePath));
	featureConfig && (frontendModuleData.match(/[^a-zA-Z0-9_]config\s*\.\s*[a-zA-Z0-9_]+/g) || []).forEach(configAttr => {
		let value = featureConfig[configAttr.match(/[a-zA-Z0-9_]+$/)[0]];
		(value !== undefined && value !== null && isNaN(value)) && (value = `"${value}"`);
		
		frontendModuleData = frontendModuleData.replace(configAttr, `${configAttr.slice(0, 1)}${value}`);
	});

	// Wrap in module construct in order to work extensibly in frontend and reduce script complexity
	frontendModuleData = `
		"use strict";
		var ${config.frontendModuleAppName} = (${config.frontendModuleReferenceName.internal} => {
		var ${config.frontendModuleReferenceName.external} = {};
		${frontendModuleData}
		${config.frontendModuleReferenceName.internal}["${featureName}"] = ${config.frontendModuleReferenceName.external}
		return ${config.frontendModuleReferenceName.internal};
		})(${config.frontendModuleAppName} || {});
	`;

	const frontendFileLocation = `/rapid.${featureName}.frontend.js`;

	// Add finisher for inserting the script tag into markup files
	finisher("html", data => {	// TODO: Which extension if sometimes only for dynamic pages?
		if(!frontendModuleData) {
			return;
		}

		return appendHead(data, `<script src="${frontendFileLocation}"></script>`);
	});

	// Add GET route to retrieve frontend module script
	route("get", `${frontendFileLocation}`, res => {
		res.setHeader("Content-Type", "text/javascript");

		return frontendModuleData;
	});
}

/**
 * Append a markup file head tag by a given string (if markup contains head tag).
 * @param {String} markup Markup
 * @param {String} str String to append head by
 * @returns {String} Markup with updated head tag
 */
function appendHead(markup, str) {
	const headInsertionIndex = markup.search(/<\s*\/head\s*>/);
	if(headInsertionIndex == -1) {
		return markup;
	}
	return markup.slice(0, headInsertionIndex) + str + markup.slice(headInsertionIndex);
}

/**
 * Create a custom cache object.
 * @param {Number} cacheRefreshFrequency 
 * @returns {Object} Cache object
 */
function createCache(cacheRefreshFrequency) {
	return require("./cache")(cacheRefreshFrequency);
}

// Initial actions

// Init frontend base file to provide reusable methods among features
initFeatureFrontend(__dirname);

// Create web server instance
http.createServer((req, res) => {
	try {
		handleRequest(req, res);
	} catch(err) {
		logError(err);
	}
}).listen(webConfig.port, null, null, _ => {
	log(`Server started listening on port ${webConfig.port}`);

	if(webConfig.devMode) {
		log("DEV MODE");
	}
});

module.exports = {
	reader,
	read,
	finisher,
	finish,
	route,
	webPath,
	config: getFromConfig,
	initFeatureFrontend,
	appendHead,
	createCache,
	log
};