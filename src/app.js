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
	frontendModuleAppName: "RAPID",
	frontendModuleReferenceName: {
		external: "plugin",
		internal: "_rapid"
	},
	mimesFileName: {
		default: "default.mimes.json",
		custom: "rapid.mimes.json"
	},
	plugInFrontendModuleName: "frontend",
	plugInNamingPrefix: "rapid-",
	supportFilePrefix: "_",
	webDirName: "web"
};

const {existsSync, readFileSync} = require("fs");
const {extname, join, dirname, basename} = require("path");
const {parse: parseUrl} = require("url");

const WEB_PATH = join(require.main.path, config.webDirName);

const utils = require("./utils");

const rateLimiter = require("./rate-limiter");

// Store identifiers of required modules from within plug-ins in order to prevent redundant loading
// processes (and overriding or adding functionality interference).
let requiredModules = new Set();

// Read config files (general configuration, MIMES)
/**
 * Read a custom configuration file and merge it (overriding) with the default configuration file.
 * @returns {Object} Resulting configuration object
 */
const readConfigFile = (webPath, defaultName, customName) => {
	const defaultFile = require(`./static/${defaultName}`);
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
const output = require("./output")(!webConfig.muteConsoleOutput);

const router = require("./interfaces/router")(output);
const pathModifier = require("./interfaces/path-modifier")(output);
const reader = require("./interfaces/reader")(output);

let responseModifierHandlers = {};

// TODO: Fix displayed .html extension in redirects

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

	// Set client-side cache control for static files too
	(extension.length > 0) && (res.setHeader("Cache-Control", `max-age=${(webConfig.devMode ? null : (webConfig.cacheRefreshFrequency / 1000))}`));
	
	// Block request if blacklist enabled but requested extension blacklisted
	// or a dynamic page related file has been explixitly requested (restricted)
	// or a non-standalone file has been requested
	if(extension.length > 0 && webConfig.extensionBlacklist && webConfig.extensionBlacklist.includes(extension)
    || (new RegExp(`.*\\/${config.dynamicPageDirPrefix}.+`)).test(pathname)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(pathname))) {
		respondProperly(res, "get", pathname, 403);

		return;
	}

	const mime = mimeTypes[(extension.length > 0) ? extension : "html"];
	mime && res.setHeader("Content-Type", mime);

	if(router.hasRoute("get", pathname)) {
		// Use custom GET route if defined on pathname as of higher priority
		try {
			data = router.applyRoute("get", pathname);
			
			respond(res, 200, data);
		} catch(err) {
			output.error(err);

			// Respond with status thrown (if is a number) or expose an internal error otherwise
			respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);
		}

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
	let modifiedPath = pathModifier.applyPathModifier(extension, localPath);
	if(modifiedPath) {
		localPath = modifiedPath;
	} else if(extname(localPath).length == 0){
		// Use explicit extension internally if is default
		localPath += `.${extension}`;
	}
	
	// Read file either by custom reader handler or by default reader
	try {
		data = reader.applyReader(extension, localPath);
	} catch(err) {
		output.error(err);
		
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
	
	// Sequentially apply defined response modifiers (dynamic pages without extension use both empty and default extension handlers)
	try {
		data = applyResponseModifier(extension, data, localPath, queryParametersObj);
	} catch(err) {
		output.error(err);
		
		respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);

		return;
	}

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
	if(!router.hasRoute("post", pathname)) {
		// Block request if no related POST handler defined
		respond(res, 404);

		return;
	}

	let blockBodyProcessing;
	let body = [];
	req.on("data", chunk => {
		body.push(chunk);

		// TODO: What if not in valid JSON format?

		const bodyByteSize = (JSON.stringify(JSON.parse(body)).length * 8);
		if(bodyByteSize > webConfig.maxPayloadSize) {
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
			const data = router.applyRoute("post", pathname, body);
			
			respond(res, 200, JSON.stringify(data));
		} catch(err) {
			output.error(err);

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

// TODO: Remove log interface

/**
 * Set up a handler to finalize each GET request response data of a certain file extension in a specific manner.
 * Multiple response modifier handlers may be set up per extension to be applied in order of setup.
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed the data string to finalize and the associated pathname returning the eventually send response data. Throwing an error code will lead to a related response.
 */
function addResponseModifier(extension, callback) {
	extension = utils.normalizeExtension(extension);

	!responseModifierHandlers[extension] && (responseModifierHandlers[extension] = []);
	
	responseModifierHandlers[extension].push(callback);
}

/**
 * Call response modifier for a specific extension.
 * @param {String} extension Extension name
 * @param {String} data Data to finalize
 * @param {String} [pathname] Pathname of associated request to pass
 * @param {Object} [queryParametersObj] Query parameters object to pass
 * @returns {*} Serializable finalizeed data
 */
function applyResponseModifier(extension, data, pathname, queryParametersObj) {
	(responseModifierHandlers[extension] || []).forEach(responseModifier => {
		const curData = responseModifier(String(data), pathname, queryParametersObj);
		curData && (data = curData);
	});

	return data;
}

/**
 * Get a value from the config object.
 * @param {String} key Key name
 * @returns {*} Respective value if defined
 */
function getFromConfig(key) {
	return webConfig[key];
}

/**
 * Initialize the frontend module of a plug-in.
 * @param {String} plugInDirPath Path to plug-in directory
 * @param {Object} plugInConfig Plug-in local config object providing static naming information
 */
function initFrontendModule(plugInDirPath, plugInConfig) {
	const plugInName = basename(dirname(plugInDirPath)).toLowerCase().replace(new RegExp(`^${config.plugInNamingPrefix}`), "");
	
	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	let frontendModuleData;
	let frontendFilePath = join(plugInDirPath, `${config.plugInFrontendModuleName}.js`);
	if(!existsSync(frontendFilePath)) {
		return;
	}

	frontendModuleData = String(readFileSync(frontendFilePath));
	plugInConfig && (frontendModuleData.match(/[^a-zA-Z0-9_]config\s*\.\s*[a-zA-Z0-9_]+/g) || []).forEach(configAttr => {
		const attr = configAttr.match(/[a-zA-Z0-9_]+$/)[0];
		let value = plugInConfig[attr];

		(value === undefined) && (output.log(`${attr} not defined in related config object at '${join(plugInDirPath, "frontend.js")}'`));

		(value !== null && isNaN(value)) && (value = `"${value}"`);	// Wrap strings in doublequotes
		
		frontendModuleData = frontendModuleData.replace(configAttr, `${configAttr.slice(0, 1)}${value}`);
	});

	// Wrap in module construct in order to work extensibly in frontend and reduce script complexity
	frontendModuleData = `
		"use strict";
		var ${config.frontendModuleAppName} = (${config.frontendModuleReferenceName.internal} => {
		var ${config.frontendModuleReferenceName.external} = {};
		${frontendModuleData}
		${config.frontendModuleReferenceName.internal}["${plugInName}"] = ${config.frontendModuleReferenceName.external}
		return ${config.frontendModuleReferenceName.internal};
		})(${config.frontendModuleAppName} || {});
	`;

	const frontendFileLocation = `/rapid.${plugInName}.frontend.js`;

	// Add response modifier for inserting the script tag into markup files
	addResponseModifier("html", data => {	// TODO: Which extension if sometimes only for dynamic pages?
		if(!frontendModuleData) {
			return;
		}

		return inflateHeadTag(data, `<script src="${frontendFileLocation}"></script>`);
	});

	// Add GET route to retrieve frontend module script
	router.setRoute("get", `${frontendFileLocation}`, _ => {
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

// Init frontend base file to provide reusable methods among plug-ins
initFrontendModule(__dirname);

// Create web server instance
const http = require(webConfig.useHttps ? "https" : "http");

http.createServer((req, res) => {
	try {
		handleRequest(req, res);
	} catch(err) {
		output.error(err);
	}
}).listen(webConfig.port, null, null, _ => {
	output.log(`Server started listening on port ${webConfig.port}`);

	if(webConfig.devMode) {
		output.log("Running DEV MODE");
	}
});

/**
 * Require a plug-in module on core level.
 * Redundant requifre calls of a specific plug-in module will be ignored.
 * @param {String} plugInName Plug-in module name
 */
function requirePluginModule(plugInName) {
	const identifier = plugInName.match(/[a-z0-9@/._-]+$/i)[0];

	if(requiredModules.has(identifier)) {
		return;
	}

	try {
		require(plugInName)(module.exports);
	} catch(err) {
		console.error(err);

		// TODO: Auto-install plug-in dependecies if enabled in config (ask otherwise)
	}

	requiredModules.add(identifier);
}

// TODO: CLI interface (clear caches, see routes, ...) OR utility methods printing info?

// TODO: Restricted URL interface?
// TODO: Provide support modules (e.g. block parser?)
module.exports = {	// TODO: Update names?
	webPath: WEB_PATH,
	output,
	addPathModifier: pathModifier.addPathModifier,
	setReader: reader.setReader,
	applyReader: reader.applyReader,
	addResponseModifier,
	applyResponseModifier,
	setRoute: router.setRoute,
	getFromConfig,
	initFrontendModule,
	require: requirePluginModule,
	createCache
};	/* {
			... {
				webPath: WEB_PATH,
			},
			... interface
		}
	*/