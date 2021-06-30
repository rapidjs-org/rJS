/**
 * @copyright (c) Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

const config = {
	compoundObject: {
		name: "compoundPage",
		basePathProperty: "base",
		argumentsProperty: "args",
	},
	configFileName: {
		custom: "rapid.config.json",
		default: "default.config.json",
		dev: "rapid.config:dev.json"
	},
	configFilePluginScopeName: "plug-ins",
	defaultFileExtension: "html",
	defaultFileName: "index",
	devModeArgument: "-dev",
	compoundPageDirPrefix: ":",
	mimesFileName: {
		custom: "rapid.mimes.json",
		default: "default.mimes.json"
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
if(webConfig.ssl) {
	options.cert = webConfig.ssl.certFile ? readCertFile(webConfig.ssl.certFile) : null;
	options.key = webConfig.ssl.keyFile ? readCertFile(webConfig.ssl.keyFile) : null;
	options.dhparam = webConfig.ssl.dhParam ? readCertFile(webConfig.ssl.dhParam) : null;
}

function readCertFile(pathname) {
	pathname = (pathname.charAt(0) == "/") ? pathname : join(WEB_PATH, pathname);
	return readFileSync(pathname);
}

// Create main server depending on set ports
const port = webConfig.portHttps || webConfig.portHttp;
require(webConfig.portHttps ? "https" : "http").createServer(options, (req, res) => {
	try {
		handleRequest(req, res);
	} catch(err) {
		output.error(err);
	}
}).listen(port, null, null, _ => {
	output.log(`Server started listening on port ${port}`);

	if(isDevMode) {
		output.log("Running DEV MODE");
	}
});
// Create HTTP to HTTPS redirect server if both ports set up
if(webConfig.portHttps && webConfig.portHttp) {
	require("http").createServer((req, res) => {
		redirect(res, `https://${req.headers.host}${req.url}`);
	}).listen(webConfig.portHttp, null, null, _ => {
		output.log(`HTTP (:${webConfig.portHttp}) to HTTPS (:${webConfig.portHttps}) redirection enabled`);
	});
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
	
	res.end(Buffer.isBuffer(message) ? message : Buffer.from(message, "UTF-8"));
}

/**
 * Respond by a simple response or redirecting to an error page depending on the request method.
 * @helper
 */
function respondWithError(res, method, pathname, status, supportsGzip) {
	// Respond with error page contents if related file exists in the current or any parent directory (bottom-up search)
	if(method.toLowerCase() == "get" && ["html", ""].includes(extname(pathname).slice(1).toLowerCase())) {
		let errorPageDir = pathname;
		do {
			errorPageDir = dirname(errorPageDir);

			let errorPagePath = join(errorPageDir, String(status));
			if(existsSync(`${join(WEB_PATH, errorPagePath)}.html`)) {
				let errorPageData = handleFile(false, errorPagePath, "html", null, supportsGzip);
				
				// Normalize references by updating the base URL accordingly (as will keep error URL in frontend)
				errorPageData = utils.injectIntoHead(errorPageData, `
				<script>
					const base = document.createElement("base");
					base.setAttribute("href", document.location.protocol + "//" + document.location.host + "${errorPageDir}");
					document.querySelector("head").appendChild(base);
					document.currentScript.parentNode.removeChild(document.currentScript);
				</script>`);	// TODO: Efficitenly retrieve hostname to insert base tag already

				respond(res, 200, errorPageData);

				return;
			}
		} while(errorPageDir != "/");
	}

	// Simple response
	respond(res, status);
}

/**
 * Handle a single request.
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function handleRequest(req, res) {
	// TODO: Implement URL escaping

	// Check GZIP compression header if to to compress response data
	let supportsGzip;
	if(req.method.toLowerCase() == "get") {
		supportsGzip = gzip && /(^|[, ])gzip($|[ ,])/.test(req.headers["accept-encoding"] || "");

		supportsGzip = supportsGzip && webConfig.gzipCompressList.includes(extension);
		supportsGzip && (res.setHeader("Content-Encoding", "gzip"));
	}

	// Block request if maximum 
	if(rateLimiter && rateLimiter.mustBlock(req.connection.remoteAddress, webConfig.maxRequestsPerMin)) {
		res.setHeader("Retry-After", 30000);
		respondWithError(res, req.method, req.url, 429, supportsGzip);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(req.url.length > webConfig.maxUrlLength) {
		respondWithError(res, req.method, req.url, 414, supportsGzip);

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
	if((explicitBase = basename(urlParts.pathname).match(new RegExp(`^(${config.defaultFileName})?(\\.html)?$`)))
		&& explicitBase[0].length > 1) {
		const newUrl = urlParts.pathname.replace(explicitBase[0], "")
                     + (urlParts.search || "");
        
		redirect(res, newUrl);

		return;
	}

	requestInterceptor.applyRequestInterceptors(req);
	
	// Set basic response headers
	webConfig.portHttps && (res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	res.setHeader("X-XSS-Protection", "1");
	res.setHeader("X-Content-Type-Options", "nosniff");

	// Apply the related handler
	if(method == "get") {
		handleGET(res, urlParts.pathname, urlParts.query, supportsGzip);

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
 * @param {Boolean} supportsGzip Whether the requesting entity supports GZIP decompression and GZIP compression is enabled
 */
function handleGET(res, pathname, queryParametersObj, supportsGzip) {
	let extension = extname(pathname).slice(1);
	const isStaticRequest = extension.length > 0;	// Whether a static file (non-page asset) has been requested

	// Set client-side cache control for static files too
	(!isDevMode && isStaticRequest && webConfig.cacheRefreshFrequency.client) && (res.setHeader("Cache-Control", `max-age=${webConfig.cacheRefreshFrequency.client}`));
	
	// Block request if blacklist enabled but requested extension blacklisted
	// or a non-standalone file has been requested
	if(isStaticRequest && webConfig.extensionWhitelist && !webConfig.extensionWhitelist.includes(extension)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(pathname))) {
		respondWithError(res, "get", pathname, 403, supportsGzip);
		
		return;
	}

	// Set MIME type header accordingly
	const mime = mimeTypes[isStaticRequest ? extension : "html"];
	mime && res.setHeader("Content-Type", mime);

	let data;

	if(router.hasRoute("get", pathname)) {
		// Use custom GET route if defined on pathname as of higher priority
		try {
			data = router.applyRoute("get", pathname);
			
			respond(res, 200, data);
		} catch(err) {
			output.error(err);

			// Respond with status thrown (if is a number) or expose an internal error otherwise
			respondWithError(res, "get", pathname, isNaN(err) ? 500 : err, supportsGzip);
		}

		return;
	}

	try {
		// Use cached data if is static file request
		if(isStaticRequest && cache.has(pathname)) {
			// Read data from cache if exists (and not outdated)
			throw cache.read(pathname);
		}

		data = handleFile(isStaticRequest, pathname, extension, queryParametersObj, supportsGzip);

		// Set server-side cache
		isStaticRequest && cache.write(pathname, data);

		respond(res, 200, data);
	} catch(err) {
		output.error(err);

		respondWithError(res, "get", pathname, isNaN(err) ? 500 : err, supportsGzip);
	}
}

function handleFile(isStaticRequest, pathname, extension, queryParametersObj, supportsGzip) {
	// Add default file name if none explicitly stated in request URL
	pathname = pathname.replace(/\/$/, `/${config.defaultFileName}`);

	let localPath = join(WEB_PATH, pathname);
	
	// Use compound page path if respective directory exists
	let isCompoundPage = false;
	let compoundPath;
	if(!isStaticRequest) {
		extension = config.defaultFileExtension;

		compoundPath = "";
		const pathParts = pathname.replace(/^\//, "").split(/\//g) || [pathname];
		for(let part of pathParts) {
			// Construct possible internal compound path
			const localCompoundPath = join(WEB_PATH, compoundPath, `${config.compoundPageDirPrefix}${part}`, `${part}.${extension}`);
			
			compoundPath = join(compoundPath, part);

			// Return compound path if related file exists in file system
			if(existsSync(localCompoundPath)) {
				isCompoundPage = true;
				localPath = localCompoundPath;

				break;
			}
		}
		// TODO: Store already obtained compound page paths mapped to request pathnames in order to reduce computing compexity (cache?)?
		
		if(!isCompoundPage) {
			// Add default file extension if is not a compound page and none explicitly stated in request URL
			localPath += `.${extension}`;
		}
	}

	// Read file either by custom reader handler or by default reader
	try {
		data = reader.applyReader(extension, localPath);
	} catch(err) {
		output.error(err);
		
		throw err;
	}
	
	// Sequentially apply defined response modifiers (compound pages without extension use both empty and default extension handlers)
	try {
		data = responseModifier.applyResponseModifiers(extension, data, localPath, queryParametersObj);
	} catch(err) {
		output.error(err);
		
		throw err;
	}

	// Implement compound page information into compound pages
	if(isCompoundPage) {
		let serializedArgsArray = pathname.slice(compoundPath.length + 2)
		.split(/\//g)
		.filter(arg => arg.length > 0);
		serializedArgsArray = (serializedArgsArray.length > 0)
			? serializedArgsArray
			.map(arg => `"${arg}"`)
			.join(",")
			: null;

		data = utils.injectIntoHead(data, `
		<script>
			RAPID.core.${config.compoundObject.name} = {
				${config.compoundObject.basePathProperty}: "/${compoundPath}",
				${config.compoundObject.argumentsProperty}: ${serializedArgsArray ? `[${serializedArgsArray}]`: "null"}
			};
			document.currentScript.parentNode.removeChild(document.currentScript);
		</script>`, true);
	}
	
	// Compress with GZIP if enabled
	supportsGzip && (data = gzip(data));
	
	return data;
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
	pluginSubKey = utils.getPluginName(pluginSubKey);

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