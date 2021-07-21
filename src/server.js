const config = {
	compoundObject: {
		name: "compoundPage",
		basePathProperty: "base",
		argumentsProperty: "args",
	},
	compoundPageDirPrefix: ":",
	defaultFileExtension: "html",
	defaultFileName: "index",
	supportFilePrefix: "_",
};	// TODO: Allow for default file name and extension / type to be changed via configuration file?


const {existsSync, readFileSync} = require("fs");
const {extname, join, dirname, basename} = require("path");
const {parse: parseUrl} = require("url");

const utils = require("./utils");

const webConfig = require("./support/config").webConfig;
const mimesConfig = require("./support/config").mimesConfig;

const webPath = require("./support/web-path");

const isDevMode = require("./support/is-dev-mode");

const staticCache = require("./support/cache");
const endpoint = require("./interface/endpoint");
const rateLimiter = (!isDevMode && (webConfig.maxRequestsPerMin > 0)) ? require("./support/rate-limiter")(webConfig.maxRequestsPerMin) : null;
const gzip = require("./support/gzip");


const output = require("./interface/output");
const reader = require("./interface/reader");
const responseModifier = require("./interface/response-modifier");
const requestInterceptor = require("./interface/request-interceptor");


const Closing = require("./interface/Closing");


const frontendModules = {
	registered: new Set(),
	data: new Map()
};


// Create web server instance

const options = {};
if(webConfig.ssl) {
	options.cert = webConfig.ssl.certFile ? readCertFile(webConfig.ssl.certFile) : null;
	options.key = webConfig.ssl.keyFile ? readCertFile(webConfig.ssl.keyFile) : null;
	options.dhparam = webConfig.ssl.dhParam ? readCertFile(webConfig.ssl.dhParam) : null;
}

function readCertFile(pathname) {
	pathname = (pathname.charAt(0) == "/") ? pathname : join(webPath, pathname);
	return readFileSync(pathname);
}

// Create main server depending on set ports
const port = webConfig.portHttps || webConfig.portHttp;
require(webConfig.portHttps ? "https" : "http").createServer(options, (req, res) => {
	// Connection entity combining request and response objects; adding url information object
	const entity = {
		req: req,
		res: res,
		url: {}
	};
	entity.req.method = entity.req.method.toLowerCase();

	const urlParts = parseUrl(entity.req.url, true);
	entity.url.pathname = urlParts.pathname;
	entity.url.extension = (extname(urlParts.pathname).length > 0) ? utils.normalizeExtension(extname(urlParts.pathname)) : config.defaultFileExtension;
	entity.url.search = urlParts.search;
	entity.url.query = urlParts.query;

	try {
		handleRequest(entity);
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


function respond(entity, status, message) {
	if(entity.req.method == "get") {
		// Set MIME type header accordingly
		const mime = mimesConfig[entity.url.extension];
		mime && entity.res.setHeader("Content-Type", mime);
		
		// Check GZIP compression header if to to compress response data
		if(/(^|[, ])gzip($|[ ,])/.test(entity.req.headers["accept-encoding"] || "") && webConfig.gzipCompressList.includes(entity.url.extension)) {
			entity.res.setHeader("Content-Encoding", "gzip");
			message = gzip(message);
		}
	}

	// Retrieve default message of status code if none given
	!message && (message = require("http").STATUS_CODES[status] || "");
    
	entity.res.statusCode = status;
	
	if(!utils.isString(message) && !Buffer.isBuffer(message)) {
		message = JSON.stringify(message);
	}
    
	entity.res.setHeader("Content-Length", Buffer.byteLength(message));
	
	entity.res.end(message);
}

/**
 * Respond by a simple response or redirecting to an error page depending on the request method.
 * @helper
 */
function respondWithError(entity, status) {
	// Respond with error page contents if related file exists in the current or any parent directory (bottom-up search)
	if(entity.req.method == "get" && entity.url.extname == config.defaultFileExtension) {
		let errorPageDir = entity.url.pathname;
		do {
			errorPageDir = dirname(errorPageDir);

			let errorPagePath = join(errorPageDir, String(status));
			
			if(existsSync(`${join(webPath, errorPagePath)}.html`)) {
				let data = handleFile(entity.req, false, errorPagePath, config.defaultFileExtension, null);
				
				// Normalize references by updating the base URL accordingly (as will keep error URL in frontend)
				data = utils.injectIntoHead(data, `
				<script>
					const base = document.createElement("base");
					base.setAttribute("href", document.location.protocol + "//" + document.location.host + "${errorPageDir}");
					document.querySelector("head").appendChild(base);
					document.currentScript.parentNode.removeChild(document.currentScript);
				</script>`);	// TODO: Efficitenly retrieve hostname to insert base tag already

				// Compress with GZIP if enabled
				supportsGzip && (data = gzip(data));

				respond(entity.res, status, data);

				return;
			}
		} while(errorPageDir != "/");
	}

	// Simple response
	respond(entity, status);
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
 * Handle a single request.
 * @param {Object} entity Connection entity
 */
function handleRequest(entity) {
	// Block request if maximum 
	if(rateLimiter && rateLimiter.mustBlock(entity.req.connection.remoteAddress)) {
		entity.res.setHeader("Retry-After", 30000);
		respondWithError(entity, 429);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(entity.req.url.length > webConfig.maxUrlLength) {
		respondWithError(entity, 414);

		return;
	}
	// Block request if method not allowed
	if(!["get", "post"].includes(entity.req.method)) {
		respond(entity, 405);

		return;
	}

	// Redirect requests explicitly stating the default file or extension name to a request with an extensionless URL
	let explicitBase;
	if((explicitBase = basename(entity.url.pathname).match(new RegExp(`^(${config.defaultFileName})?(\\.${config.defaultFileExtension})?$`)))
		&& explicitBase[0].length > 1) {
		const newUrl = entity.url.pathname.replace(explicitBase[0], "")
                     + (entity.url.search || "");
        
		redirect(entity.res, newUrl);

		return;
	}

	// Set basic response headers
	webConfig.portHttps && (entity.res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (entity.res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	entity.res.setHeader("X-XSS-Protection", "1");
	entity.res.setHeader("X-Content-Type-Options", "nosniff");

	// Apply the related handler
	switch(entity.req.method) {
		case "get":
			handleGET(entity);
			break;
		case "post":
			handlePOST(entity);
			break;
	}

	// Apply request interceptors once response has been completed so manipulation will have no influence
	requestInterceptor.applyRequestInterceptors(entity.req);	// TODO: Add final status code to request object
}

/**
 * Handle a GET request accordingly.
 * @param {Object} entity Open connection entity
 * @param {String} pathname URL pathname part
 * @param {String} extension Pathname stated file extension
 * @param {String} queryParameterObj Query string parameters in object representation
 * @param {Boolean} supportsGzip Whether the requesting entity supports GZIP decompression and GZIP compression is enabled
 */
function handleGET(entity) {
	let data;
	
	if(frontendModules.data.has(entity.url.pathname)) {
		data = frontendModules.data.get(entity.url.pathname);

		entity.url.extension = "js";

		respond(entity, 200, data);
		
		return;
	}

	const isStaticRequest = entity.url.extension != config.defaultFileExtension;	// Whether a static file (non-page asset) has been requested
	
	// Set client-side cache control for static files
	(!isDevMode && isStaticRequest && webConfig.cachingDuration.client) && (entity.res.setHeader("Cache-Control", `max-age=${webConfig.cachingDuration.client}`));
	
	// Block request if whitelist enabled but requested extension not stated
	// or a non-standalone file has been requested
	if(webConfig.extensionWhitelist && !webConfig.extensionWhitelist.includes(entity.url.extension)
	|| (new RegExp(`^${config.supportFilePrefix}.+$`)).test(basename(entity.url.pathname))) {
		respondWithError(entity, 403);
		
		return;
	}

	// Use cached data if is static file request (and not outdated)
	if(isStaticRequest && staticCache.has(entity.url.pathname)) {
		data = staticCache.read(entity.url.pathname);

		respond(entity, 200, data);

		return;
	}

	try {
		data = handleFile(entity.req, isStaticRequest, entity.url.pathname, entity.url.extension, entity.url.query);

		// Set server-side cache
		isStaticRequest && staticCache.write(entity.url.pathname, data);
		
		respond(entity, 200, data);
	} catch(err) {
		output.error(err);

		respondWithError(entity, isNaN(err.status) ? 500 : err.status);
	}
}

function handleFile(req, isStaticRequest, pathname, extension, queryParameterObj) {
	// Add default file name if none explicitly stated in request URL
	pathname = pathname.replace(/\/$/, `/${config.defaultFileName}`);

	let localPath = join(webPath, pathname);
	(extension == config.defaultFileExtension) && (localPath = `${localPath.replace(/\/$/, `/${config.defaultFileName}`)}.${config.defaultFileExtension}`);

	// Use compound page path if respective directory exists
	let compoundPath;
	if(!isStaticRequest) {
		compoundPath = "";
		const pathParts = pathname.replace(/^\//, "").split(/\//g) || [pathname];
		for(let part of pathParts) {
			// Construct possible internal compound path
			const localCompoundPath = join(webPath, compoundPath, `${config.compoundPageDirPrefix}${part}`, `${part}.${extension}`);
			
			compoundPath = join(compoundPath, part);

			// Return compound path if related file exists in file system
			if(existsSync(localCompoundPath)) {
				localPath = localCompoundPath;

				break;
			}
		}
		// TODO: Store already obtained compound page paths mapped to request pathnames in order to reduce computing compexity (cache?)?
		
		if(!compoundPath) {
			// Add default file extension if is not a compound page and none explicitly stated in request URL
			localPath += `.${extension}`;
		}
	}

	let data;

	// Read file either by custom reader handler or by default reader
	try {
		data = reader.useReader(extension, localPath);
	} catch(err) {
		output.error(err);
		
		throw err;
	}

	// Construct reduced request object to be passed to each response modifier handler
	const reducedRequestObject = {
		ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
		pathname: localPath,
		queryParameter: queryParameterObj
	};
	
	// Sequentially apply defined response modifiers (compound pages without extension use both empty and default extension handlers)
	try {
		data = responseModifier.applyResponseModifiers(extension, data, reducedRequestObject);
		
		compoundPath && (data = responseModifier.applyResponseModifiers(":html", data, reducedRequestObject));	// Compound page specific modifiers
	} catch(err) {
		output.log(`Error applying response modifiers for '${pathname}'`);
		output.error(err);
		
		throw err;
	}

	// Implement compound page information into compound pages
	if(compoundPath) {
		let serializedArgsArray = pathname.slice(compoundPath.length + 2)
			.split(/\//g)
			.filter(arg => arg.length > 0);
		serializedArgsArray = (serializedArgsArray.length > 0)
			? serializedArgsArray
				.map(arg => `"${arg}"`)
				.join(",")
			: null;
		
		data = utils.injectIntoHead(String(data), `
		<script>
			rapidJS.core.${config.compoundObject.name} = {
				${config.compoundObject.basePathProperty}: "/${compoundPath}",
				${config.compoundObject.argumentsProperty}: ${serializedArgsArray ? `[${serializedArgsArray}]`: "null"}
			};
			document.currentScript.parentNode.removeChild(document.currentScript);
		</script>`, true);
	}
	
	return data;
}

/**
 * Handle a POST request accordingly.
 * @param {Object} entity Open connection entity
 * @param {String} pathname URL pathname part (resembling plug-in name as of dedicated endpoints paradigm)
 */
function handlePOST(entity) {
	if(!endpoint.hasEndpoint(entity.url.pathname)) {
		// No related POST handler defined
		respond(entity, 404);

		return;
	}

	let blockBodyProcessing;
	let body = [];
	entity.req.on("data", chunk => {
		if(blockBodyProcessing) {
			// Ignore further processing as maximum payload has been exceeded
			return;
		}

		body.push(chunk);

		const bodyByteSize = (JSON.stringify(JSON.parse(body)).length * 8);
		if(bodyByteSize > webConfig.maxPayloadSize) {
			// Request payload exceeds maximum size as put in web config
			blockBodyProcessing = true;

			respond(entity, 413);
		}
	});
	entity.req.on("end", _ => {
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
			let data = endpoint.applyEndpoint(entity.url.pathname, body);

			data = JSON.stringify(data);

			respond(entity, 200, data);
		} catch(err) {
			output.error(err);

			respond(entity, isNaN(err.status) ? 500 : err.status, JSON.stringify(err.message));
		}
	});
	entity.req.on("error", _ => {
		respond(entity, 500);
	});
}

module.exports = {
	registerFrontendModule: (pluginName, pathname, data) => {
		if(frontendModules.registered.has(pluginName)) {
			output.log(`Redundant initialization of frontend module for plug-in '${pluginName}'`);
		}
		
		frontendModules.registered.add(pluginName);
		frontendModules.data.set(pathname, data);
	}
};