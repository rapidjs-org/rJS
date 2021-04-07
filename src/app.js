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
	dynamicPageDirPrefix: ":",
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
const cache = require("./cache");

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

const log = require("./log")(webConfig.logMessages);

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
	if(method.toLowerCase() == "get") {
		redirectErrorPage(res, status, pathname);

		return;
	}

	respond(res, status);
}

// TODO: CACHE TO PASS TO FEATURES (AND IMPLEMENTATION IN EXISTING)

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
			data = routeHandlers.get[pathname](res);

			respond(res, 200, data);
		} catch(err) {
			// Respond with status thrown (if is a number) or expose an internal error otherwise
			respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);
		}

		return;
	}

	let extension = extname(pathname).slice(1);

	// Block request if whitelist enabled but requested extension not whitelisted
	// or a dynamic page related file has been explixitly requested (restricted)
	// or a non-standalone file has been requested
	if(extension.length > 0 && webConfig.extensionWhitelist && webConfig.extensionWhitelist.includes(extension)
    || (new RegExp(`.*\\/${config.dynamicPageDirPrefix}.+`)).test(pathname)
	|| (new RegExp(`^${config.nonStandaloneFilePrefix}.+$`)).test(basename(pathname))) {
		respondProperly(res, "get", pathname, 403);

		return;
	}

	const mime = mimeTypes[(extension.length > 0) ? extension : "html"];
	mime && res.setHeader("Content-Type", mime);

	if(cache.has(pathname, webConfig.cacheRefreshFrequency)) {
		// Read data from cache if exists (and not outdated)
		respond(res, 200, cache.read(pathname));

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

		data = String(readFileSync(localPath));
	}

	// Sequentially apply defined finishers (dynamic pages without extension use both empty and default extension handlers)
	try {
		data = finish(extension, data, localPath);
	} catch(err) {
		log(err);
		
		respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);	// TODO: Determine type of redirect
	}

	cache.write(pathname, data);

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
			const data = routeHandlers.post[pathname](body, res);

			respond(res, 200, JSON.stringify(data));
		} catch(err) {
			respond(res, isNaN(err) ? 500 : err);

			isNaN(err) && logError(err);
		}
	});
	req.on("error", _ => {
		respond(res, 500);
	});
}	// TODO: Fix 404 redirect issue

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

/**
 * Set up a handler to read each GET request response data in of a certain file extension in a specific manner (instead of using the default reader).
 * By nature of a reading process only one reader handler may be set per extension (overriding allowed).
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed the the associated pathname. Throwing an error code leads to a related response.
 */
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
 * @returns {String} Finished data
 */
function read(extension, pathname) {
	if(!utils.isFunction(readerHandlers[extension])) {
		throw 1;
	}

	return String(readerHandlers[extension](pathname));
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
 * @returns {String} Finished data
 */
function finish(extension, data, pathname) {
	let definedFinishHandlers = (finisherHandlers[extension] || []).concat((finisherHandlers["html"] && extension.length == 0) ? finisherHandlers["html"] : []);
	definedFinishHandlers.forEach(finisher => {
		data = String(finisher(data, pathname));
	});

	return data;
}

/**
 * Set up a custom route handler for a certain method.
 * @param {String} method Method to bind route to
 * @param {String} pathname Pathname to bind route to
 * @param {Function} callback Callback getting passed the response object and – if applicable – the request's body object returning the eventually send response data
 */
function route(method, pathname, callback) {
	method = String(method).trim().toLowerCase();

	if(!["get", "post"].includes(method)) {
		throw new SyntaxError(`${method.toUpperCase()} is not a supported HTTP method`);
	}

	routeHandlers[method][pathname] && (log(`Redunant ${method.toUpperCase()} route handler set up for '${pathname}'`));

	routeHandlers[method][pathname] = callback;
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

function initFeatureFrontend(featureDir, frontendModuleFileName, config) {
	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	let frontendModuleData;
	let frontendFilePath = join(featureDir, "frontend.js");
	if(!existsSync(frontendFilePath)) {
		return;
	}

	frontendModuleData = String(readFileSync(frontendFilePath));
	config && (frontendModuleData.match(/[^a-zA-Z0-9_]config\s*\.\s*[a-zA-Z0-9_]+/g) || []).forEach(configAttr => {
		let value = config[configAttr.match(/[a-zA-Z0-9_]+$/)[0]];
		(value !== undefined && value !== null && isNaN(value)) && (value = `"${value}"`);
		
		frontendModuleData = frontendModuleData.replace(configAttr, `${configAttr.slice(0, 1)}${value}`);
	});
	// Wrap in module construct in roder to work extensibly in frontend and reduce script complexity
	frontendModuleData = `
		"use strict";
		var RAPID = (module => {
		${frontendModuleData}
		return module;
		})(RAPID || {});
	`;

	const frontendFileLocation = `/rapid.${frontendModuleFileName}.frontend.js`;

	// Add finisher
	finisher("html", data => {	// TODO: Which extension?
		if(!frontendModuleData) {
			return;
		}

		// Insert frontend module loading script tag
		const headInsertionIndex = data.search(/<\s*\/head\s*>/);
		if(headInsertionIndex == -1) {
			return data;
		}
		data = data.slice(0, headInsertionIndex) + `<script src="${frontendFileLocation}"></script>` + data.slice(headInsertionIndex);
		return data;
	});

	// Add GET route to retrieve frontend module script
	route("get", `${frontendFileLocation}`, res => {
		res.setHeader("Content-Type", "text/javascript");

		return frontendModuleData;
	});
}

// Init frontend base file to provide reusable methods among features
initFeatureFrontend(__dirname, "base");

// TODO: Expose chaching method?
module.exports = {
	reader,
	read,
	finisher,
	finish,
	route,
	webPath,
	config: getFromConfig,
	initFeatureFrontend,
	log
};