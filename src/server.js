/**
 * @copyright (c) Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

const config = {
	configFileName: {
		default: "default.config.json",
		dev: "rapid.config:dev.json",
		custom: "rapid.config.json"
	},
	configFilePluginScopeName: "plug-ins",
	defaultFileExtension: "html",
	defaultFileName: "index",
	devModeArgument: "-dev",
	compoundPageDirPrefix: ":",
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

const utils = require("./utils");

// Interfaces

const output = require("./interface/output");

const reader = require("./interface/reader");
const responseModifier = require("./interface/response-modifier");
const requestInterceptor = require("./interface/request-interceptor");

const WEB_PATH = join(dirname(require.main.filename), config.webDirName);

let isDevMode;
if(process.argv[2] && process.argv[2] == config.devModeArgument) {
	// Enable DEV-mode when related argument passed on application start
	isDevMode = true;
}

// TODO: Add HTTP to HTTPS redirection (server) feature?

// Read config files (general configuration, MIMES)

/**
 * Read a custom configuration file and merge it (overriding) with the default configuration file.
 * @returns {Object} Resulting configuration object
 */
const readConfigFile = (webPath, defaultName, customNames) => {
	let defaultFile = require(`./static/${defaultName}`);

	customNames = Array.isArray(customNames) ? customNames : [customNames];
	const customFiles = customNames
		.filter(customName => {
			if(!customName) {
				return false;
			}

			const customFilePath = join(dirname(webPath), customName);
			if(existsSync(customFilePath)) {
				return true;
			}
			return false;
		}).map(customName => {
			return require(join(dirname(webPath), customName));
		});

	for(let subKey in defaultFile) {
		if((defaultFile[subKey] || "").constructor.name !== "Object") {
			continue;
		}

		customFiles.forEach(customFile => {
			if((customFile[subKey] || "").constructor.name !== "Object") {
				return;
			}

			defaultFile[subKey] = {...defaultFile[subKey], ...customFile[subKey]};
		});
	}

	customFiles.forEach(customFile => {
		defaultFile = {...defaultFile, ...customFile};
	});

	return defaultFile;
};

const webConfig = readConfigFile(WEB_PATH, config.configFileName.default, [
	config.configFileName.custom,
	isDevMode ? config.configFileName.dev : null
]);

const mimeTypes = readConfigFile(WEB_PATH, config.mimesFileName.default, config.mimesFileName.custom);

webConfig.extensionWhitelist = normalizeExtensionArray(webConfig.extensionWhitelist);
webConfig.gzipCompressList = normalizeExtensionArray(webConfig.gzipCompressList);

function normalizeExtensionArray(array) {
	return (Array.isArray(array) && array.length > 0) ? array.map(extension => extension.replace(/^\./, "").toLowerCase()) : undefined;
}

// Support

const rateLimiter = !isDevMode ? require("./support/rate-limiter") : null;
const gzip = (!isDevMode && webConfig.gzipCompressList) ? require("./support/gzip") : null;

const cache = createCache();

// Config depending interfaces

const router = require("./interface/router")(cache);

// Server functionality

// Create web server instance

const options = {};
webConfig.sslCertFile && (options.cert = readCertFile(webConfig.sslCertFile));
webConfig.sslKeyFile && (options.key = readCertFile(webConfig.sslKeyFile));
webConfig.dhParam && (options.dhparam = readCertFile(webConfig.dhParam));

function readCertFile(pathname) {
	pathname = (pathname.charAt(0) == "/") ? pathname : join(WEB_PATH, pathname);
	return readFileSync(pathname);
}

const http = require(webConfig.useHttps ? "https" : "http");
http.createServer(options, (req, res) => {
	try {
		handleRequest(req, res);
	} catch(err) {
		output.error(err);
	}
}).listen(webConfig.port, null, null, _ => {
	output.log(`Server started listening on port ${webConfig.port}`);

	if(isDevMode) {
		output.log("Running DEV MODE");
	}
});


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
function redirectErrorPage(res, status, path) {	// TODO: No redirect, but status exposed along error file contents (if exists)?
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

	// TODO: Fallback page?
}

/**
 * Perform a response.
 * @param {Object} res Open response object
 * @param {*} status Status code to use
 * @param {*} message Message to use
 */
function respond(res, status, message) {
	// Retrieve default message of status code if none given
	!message && (message = require("http").STATUS_CODES[status] || "");
    
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
	if(rateLimiter && rateLimiter.mustBlock(req.connection.remoteAddress, webConfig.maxRequestsPerMin)) {
		res.setHeader("Retry-After", 30000);
		respondProperly(res, req.method, req.url, 429);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(req.url.length > webConfig.maxUrlLength) {
		respondProperly(res, req.method, req.url, 414);

		return;
	}
	// Block request if method not allowed
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

	requestInterceptor.applyRequestInterceptor(req);
	
	// Set basic response headers
	webConfig.useHttps && (res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	res.setHeader("X-XSS-Protection", "1");
	res.setHeader("X-Content-Type-Options", "nosniff");

	// Apply the related handler
	if(method == "get") {
		const useGzip = gzip && /(^|[, ])gzip($|[ ,])/.test(req.headers["accept-encoding"] || "");

		handleGET(res, urlParts.pathname, urlParts.query, useGzip);

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
 * @param {String} pathname URL pathname part
 * @param {String} queryParametersObj Query string parameters in object representation
 * @param {Boolean} useGzip Whether the requesting entity supports GZIP decompression and GZIP compression is enabled
 */
function handleGET(res, pathname, queryParametersObj, useGzip) {
	let data;

	let extension = extname(pathname).slice(1);
	const isStaticRequest = extension.length > 0;	// Whether a static file (non-page asset) has been requested

	// Set client-side cache control for static files too
	(!isDevMode && isStaticRequest && webConfig.cacheRefreshFrequency.client) && (res.setHeader("Cache-Control", `max-age=${webConfig.cacheRefreshFrequency.client}`));
	
	// Block request if blacklist enabled but requested extension blacklisted
	// or a non-standalone file has been requested
	if(isStaticRequest && webConfig.extensionWhitelist && !webConfig.extensionWhitelist.includes(extension)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(pathname))) {
		respondProperly(res, "get", pathname, 403);

		return;
	}

	// Set MIME type header accordingly
	const mime = mimeTypes[isStaticRequest ? extension : "html"];
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

	// Set GZIP compression header if about to compress response data
	useGzip = useGzip && webConfig.gzipCompressList.includes(extension);
	useGzip && (res.setHeader("Content-Encoding", "gzip"));
	
	// Use cached data if is static file request
	if(isStaticRequest && cache.has(pathname)) {
		// Read data from cache if exists (and not outdated)
		respond(res, 200, cache.read(pathname));
		
		return;
	}

	let localPath = join(WEB_PATH, pathname);
	
	// Add default file name if none explicitly stated in request URL
	localPath = localPath.replace(new RegExp(`(\\/)((${config.compoundPageDirPrefix}[a-zA-Z0-9_][a-zA-Z0-9_-]*)+)?$`), `$1${config.defaultFileName}$2`);

	// Use compound page path if respective directory exists
	if(!isStaticRequest) {
		extension = config.defaultFileExtension;

		// Construct internal compound path representation
		let compoundPath = localPath.replace(new RegExp(`(\\${config.compoundPageDirPrefix}[a-z0-9_-]+)+$`, "i"), "");	// Stripe compound argument part fom pathname
		compoundPath = join(dirname(compoundPath), config.compoundPageDirPrefix + basename(compoundPath), `${basename(compoundPath)}.${extension}`);

		// Return compound path if related file exists in file system
		if(existsSync(compoundPath)) {
			localPath = compoundPath;
		} else {
		// Add default file extension if none explicitly stated in request URL
			localPath += `.${config.defaultFileExtension}`;
		}
	}

	// Read file either by custom reader handler or by default reader
	try {
		data = reader.applyReader(extension, localPath);
	} catch(err) {
		if(err !== 404) {	// TODO: Also expose 404
			output.error(err);

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
	
	// Sequentially apply defined response modifiers (compound pages without extension use both empty and default extension handlers)
	try {
		data = responseModifier.applyResponseModifier(extension, data, localPath, queryParametersObj);
	} catch(err) {
		output.error(err);
		
		respondProperly(res, "get", pathname, isNaN(err) ? 500 : err);

		return;
	}
	
	// Compress with GZIP if enabled
	useGzip && (data = gzip(data));
	
	// Set server-side cache
	isStaticRequest && cache.write(pathname, data);
	
	respond(res, 200, Buffer.isBuffer(data) ? data : Buffer.from(data, "UTF-8"));
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
			try {
				body = JSON.parse(body);
			} catch(err) {
				throw new SyntaxError(`POST request does not provide a valid JSON body object '${pathname}'`);
			}
		}

		try {
			let data = router.applyRoute("post", pathname, body);
			
			data = JSON.stringify(data);

			respond(res, 200, data);
		} catch(err) {
			output.error(err);

			respond(res, isNaN(err) ? 500 : err);
		}
	});
	req.on("error", _ => {
		respond(res, 500);
	});
}


// Implicit interfaces

/**
 * Create a custom cache object.
 * @param {Number} [cacheRefreshFrequency] Cache refresh frequency in seconds (server cache frequency as set in config file by default) 
 * @returns {Object} Cache object providing a manipulation interface
 */
function createCache() {
	return require("./support/cache")(isDevMode ? null : webConfig.cacheRefreshFrequency.server);
}

/**
 * Get a value from the config object stored in the plug-in related sib object.
 * @param {String} key Key name
 * @returns {*} Respective value if defined
 */
function getFromConfig(key) {
	let pluginSubKey = utils.getCallerPath(__filename);
	pluginSubKey = utils.getPluginName(basename(dirname(pluginSubKey)));

	const subObj = (webConfig[config.configFilePluginScopeName] || {})[pluginSubKey];
	
	return subObj ? subObj[key] : undefined;
}

// TODO: Provide option to set/change response headers?


module.exports = {
	webPath: WEB_PATH,
	isDevMode: isDevMode,

	createCache,
	getFromConfig,

	setRoute: router.setRoute
};