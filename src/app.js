/**
 * @copyright (c) Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

// Syntax literals config object
const config = {
	configFileName: {
		default: "default.config.json",
		custom: "rapid.config.json"
	},
	defaultFileName: "index",
	devModeArgument: "-dev",
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
	supportFilePrefix: "_",
	webDirName: "web"
};

const {existsSync, readFileSync} = require("fs");
const {extname, join, dirname, basename} = require("path");
const {parse: parseUrl} = require("url");

const WEB_PATH = join(require.main.path, config.webDirName);

const utils = require("./utils");
const rateLimiter = require("./rate-limiter");

// Store identifiers of required modules from within features in order to prevent redundant loading
// processes (and overriding or adding functionality interference).
let requiredModules = new Set();

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
const log = require("./log")(!webConfig.muted);

const http = require(webConfig.useHttps ? "https" : "http");

// Request reader, finisher and custom method handler objects
let pathModifierHandlers = {};
let readerHandlers = {};
let finisherHandlers = {};
let routeHandlers = {
	get: [],
	post: []
};

function logError(err) {
	if(!isNaN(err)) {
		// Do not log thrown status error used for internal redirect
		return;
	}

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
		handleGET(res, urlParts.pathname, urlParts.query);

		return;
	} 
	if(method == "post") {
		handlePOST(req, res, urlParts.pathname);
        
		return;
	}
}

// TODO: Soft code default extension again?

/**
 * Handle a GET request accordingly.
 * @param {Object} res Active response object
 * @param {String} pathname URL pathname part
 * @param {String} [queryParametersObj] Query string parameters in object representation
 */
function handleGET(res, pathname, queryParametersObj) {
	let data;

	let extension = extname(pathname).slice(1);

	const mime = mimeTypes[(extension.length > 0) ? extension : "html"];
	mime && res.setHeader("Content-Type", mime);

	if(routeHandlers.get[pathname]) {
		// Use custom GET route if defined on pathname as of higher priority
		try {
			data = useRoute("get", pathname);
			
			respond(res, 200, data);
		} catch(err) {
			logError(err);

			// Respond with status thrown (if is a number) or expose an internal error otherwise
			respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);
		}

		return;
	}

	// Block request if blacklist enabled but requested extension blacklisted
	// or a dynamic page related file has been explixitly requested (restricted)
	// or a non-standalone file has been requested
	if(extension.length > 0 && webConfig.extensionBlacklist && webConfig.extensionBlacklist.includes(extension)
    || (new RegExp(`.*\\/${config.dynamicPageDirPrefix}.+`)).test(pathname)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(pathname))) {
		respondProperly(res, "get", pathname, 403);

		return;
	}

	// Retrieve correct cache
	let relatedCache;
	if(extension.length == 0) {
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

	(extension.length == 0) && (extension = "html");
	
	// Apply local pathname modifier if set up
	let modifiedPath = modifyPath(extension, localPath);
	if(modifiedPath) {
		localPath = modifiedPath;
	} else if(extname(localPath).length == 0){
		// Use explicit extension internally if is default
		localPath += `.${extension}`;
	}
	
	// Read file either by custom reader handler or by default reader
	try {
		data = read(extension, localPath);
	} catch(err) {
		logError(err);
		
		if(err !== 404) {
			respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);

			return;
		}
		if(!existsSync(localPath)) {
			// Redirect to the related error page if requested file does not exist
			respondProperly(res, "get", pathname, 404);
	
			return;
		}
		
		data = readFileSync(localPath);
	}
	
	// Sequentially apply defined finishers (dynamic pages without extension use both empty and default extension handlers)
	try {
		data = finish(extension, data, localPath, queryParametersObj);
	} catch(err) {
		logError(err);
		
		respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);

		return;
	}

	// Set client-side cache control for static files too
	(extension.length > 0) && (res.setHeader("Cache-Control", `max-age=${(webConfig.devMode ? null : (webConfig.cacheRefreshFrequenc / 1000))}`));
	
	// Set server-side cache
	relatedCache.write(pathname, data);

	respond(res, 200, Buffer.from(data, "UTF-8"));
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
			const data = useRoute("post", pathname, body);
			
			respond(res, 200, JSON.stringify(data));
		} catch(err) {
			logError(err);

			respond(res, isNaN(err) ? 500 : err);
		}
	});
	req.on("error", _ => {
		respond(res, 500);
	});
}

/**
 * Inflate a markup file's head tag by a given string inserting it as first child (if markup contains head tag).
 * @param {String} markup Markup
 * @param {String} str String to append head by
 * @returns {String} Markup with updated head tag
 */
function inflateHeadTag(markup, str) {
	const openingHeadTag = markup.match(/<\s*head((?!>)(\s|.))*>/);

	if(!openingHeadTag) {
		return markup;
	}

	return markup.replace(openingHeadTag[0], `${openingHeadTag[0]}${str}`);
}

/**
 * Set up a handler to modifiy the local request URL for certain file type requests.
 * Multiple pathname modifier handlers may be set up per extension to be applied in order of setup.
 * @param {String} extension Extension name (without a leading dot)
 * @param {Function} callback Callback getting passed the the request URL in local pathname representation to return the modified path (or null if to use default local path)
 */
function pathModifier(extension, callback) {
	extension = utils.normalizeExtension(extension);

	!pathModifierHandlers[extension] && (pathModifierHandlers[extension] = []);
	
	pathModifierHandlers[extension].push(callback);
}

function modifyPath(extension, pathname) {
	if(!pathModifierHandlers[extension]) {
		return null;
	}

	let curPathname;
	try {
		pathModifierHandlers[extension].forEach(pathModifier => {
			curPathname = pathModifier(pathname);
			curPathname && (pathname = curPathname);
		});
	} catch(err) {
		logError(err);
	}

	return (curPathname === null) ? null : pathname;
}

/**
 * Set up a handler to read each GET request response data in of a certain file extension in a specific manner (instead of using the default reader).
 * By nature of a reading process only one reader handler may be set per extension (overriding allowed).
 * @param {String} extension Extension name (without a leading dot)
 * @param {Function} callback Callback getting passed the the associated pathname. Throwing an error code will lead to a related response.
 */
function reader(extension, callback) {
	extension = utils.normalizeExtension(extension);

	(extension.length == 0) && (extension = "html");

	(readerHandlers[extension]) && (log(`Overriding reader for '${extension}' extension`));
	
	readerHandlers[extension] = callback;
}

/**
 * Call reader for a specific extension.
 * @param {String} extension Extension name (without a leading dot)
 * @param {String} pathname Pathname of request
 * @returns {*} Serializable read data
 */
function read(extension, pathname) {
	if(!utils.isFunction(readerHandlers[extension])) {
		throw 404;
	}

	return readerHandlers[extension](pathname);
}

/**
 * Set up a handler to finish each GET request response data of a certain file extension in a specific manner.
 * Multiple finisher handlers may be set up per extension to be applied in order of setup.
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed the data string to finish and the associated pathname returning the eventually send response data. Throwing an error code will lead to a related response.
 */
function finisher(extension, callback) {
	extension = utils.normalizeExtension(extension);

	!finisherHandlers[extension] && (finisherHandlers[extension] = []);
	
	finisherHandlers[extension].push(callback);
}

/**
 * Call finisher for a specific extension.
 * @param {String} extension Extension name
 * @param {String} data Data to finish
 * @param {String} [pathname] Pathname of associated request to pass
 * @param {Object} [queryParametersObj] Query parameters object to pass
 * @returns {*} Serializable finished data
 */
function finish(extension, data, pathname, queryParametersObj) {
	(finisherHandlers[extension] || []).forEach(finisher => {
		const curData = finisher(String(data), pathname, queryParametersObj);
		curData && (data = curData);
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

function useRoute(method, pathname, args) {
	// TODO: Make response object accessible to allow modification?
	let data;

	if(routeHandlers[method][pathname].cached) {
		data = routeHandlers[method][pathname].cached;
	} else {
		(args && !Array.isArray(args)) && (args = [args]);
		data = routeHandlers[method][pathname].callback.apply(null, args);

		routeHandlers[method][pathname].cachePermanently && (routeHandlers[method][pathname].cached = data);
	}

	return data;
}

/**
 * Get the fully qualified web root directory path.
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
 * Initialize the frontend module of a feature.
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
		const attr = configAttr.match(/[a-zA-Z0-9_]+$/)[0];
		let value = featureConfig[attr];

		(value === undefined) && (log(`config.${attr} undefined at '${join(__dirname, "frontend.js")}'`));

		(value !== null && isNaN(value)) && (value = `"${value}"`);	// Wrap strings in doublequotes
		
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

		return inflateHeadTag(data, `<script src="${frontendFileLocation}"></script>`);
	});

	// Add GET route to retrieve frontend module script
	route("get", `${frontendFileLocation}`, _ => {
		return frontendModuleData;
	});
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
		log("Running DEV MODE");
	}
});

/**
 * Require a feature module on core level.
 * Redundant requifre calls of a specific feature module will be ignored.
 * @param {String} module Module identifier
 */
function requireFeatureModule(featureModule) {
	const identifier = featureModule.match(/[a-z0-9@/._-]+$/i)[0];

	if(requiredModules.has(identifier)) {
		return;
	}

	require(featureModule)(module.exports);

	requiredModules.add(identifier);
}

// TODO: CLI interface (clear caches, see routes, ...) OR utility methods printing info?

// TODO: Restricted URL interface?
// TODO: Provide support modules (e.g. block parser?)

module.exports = {	// TODO: Update names?
	pathModifier,
	reader,
	read,
	finisher,
	finish,
	route,
	webPath,
	config: getFromConfig,
	initFeatureFrontend,
	createCache,
	require: requireFeatureModule,
	log
};