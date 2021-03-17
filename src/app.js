/**
 * Copyright (c) Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

// Local config
const config = {
	defaultExtensionName: "html",
	defaultFileName: "index",
    dynamicPageDirPrefix: "=",
	webDirName: "web"
};

const {existsSync, readFileSync, fstat} = require("fs");
const {extname, join, dirname, basename} = require("path");
const {parse: parseUrl} = require("url");

const WEB_PATH = join(require.main.path, config.webDirName);

const webConfig = require("./web-config")(WEB_PATH);

const utils = require("./utils");
const rateLimiter = require("./rate-limiter");
const cache = require("./cache");
const log = require("./log")(webConfig.logMessages);

const mimeTypes = require("./mime-types");

const http = require(webConfig.useHttps ? "https" : "http");

// Request finish and custom method handler objects
let finishHandlers = {};
let customHandlers = {
	get: [],
	post: []
};

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
		if(existsSync(`${join(WEB_PATH, errorPagePath)}.${config.defaultExtensionName}`)) {
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
 * Handle a single request.
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
function handleRequest(req, res) {
	// Block request if maximum 
	if(rateLimiter.mustBlock(req.connection.remoteAddress, webConfig.maxRequestsPerMin)) {
		res.setHeader("Retry-After", 30000);
		respondProperly(429);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(req.url.length > webConfig.maxUrlLength) {
		respondProperly(414);

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
	if(urlParts.pathname.match(new RegExp(`(${config.defaultFileName})?(\\.${config.defaultExtensionName})?$`))[0].length > 0) {
		const newUrl = urlParts.pathname.replace(new RegExp(`(${config.defaultFileName})?(\\.${config.defaultExtensionName})?$`), "")
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

	/**
     * Respond by a simple response or redirecting to an error page depending on the request method.
     * @helper
     * @param {Number} status Status code
     */
	function respondProperly(status) {
		if(req.method.toLowerCase() == "get") {
			redirectErrorPage(res, status, req.url);

			return;
		}

		respond(res, status);
	}
}

/**
 * Handle a GET request accordingly.
 * @param {Object} res Active response object
 * @param {String} pathname URL pathname part
 */
function handleGET(res, pathname) {
	let data;

	if(customHandlers.get[pathname]) {
		// Use custom GET route if defined on pathname as of higher priority
		try {
			data = customHandlers.get[pathname]();

			respond(res, 200, data);
		} catch(err) {
			// Respond with status thrown (if is a number) or expose an internal error otherwise
            respond(res, isNan(err) ? 500 : err);
		}

        return;
    }

	let extension = extname(pathname).slice(1);

	// Block request if whitelist enabled but requested extension not whitelisted
    // or a dynamic page related file has been explixitly requested (restricted)
	if(extension.length > 0 && webConfig.extensionWhitelist && webConfig.extensionWhitelist.includes(extension)
    || (new RegExp(`.*\\/${config.dynamicPageDirPrefix}.+`)).test(pathname)) {
		redirectErrorPage(res, 403, pathname);

		return;
	}

	const mime = mimeTypes[(extension.length > 0) ? extension : config.defaultExtensionName];
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
        const localPathDynamic = join(dirname(localPath), config.dynamicPageDirPrefix + basename(localPath), `${basename(localPath)}.${config.defaultExtensionName}`);
        if(existsSync(localPathDynamic)) {
            // Use dynamic page root file path for further processing
            localPath = localPathDynamic;

			// Stop processing as request has already been closed due to handler exception
			if(dynamicClose()) {
				return;
			}
        } else {
            // Add default extension if none explicitly stated in the request URL
            localPath += `.${config.defaultExtensionName}`;

			extension = config.defaultExtensionName;
        }
	}

	if(!existsSync(localPath)) {
		// Redirect to the related error page if requested file does not exist
		redirectErrorPage(res, 404, localPath);

		return;
	}

    data = String(readFileSync(localPath));

    // Sequentially apply defined finishers (dynamic pages without extension use both empty and default extension handlers)
	let definedFinishHandlers = (finishHandlers[extension] || []).concat((finishHandlers[config.defaultExtensionName] && extension.length == 0) ? finishHandlers[config.defaultExtensionName] : []);
	definedFinishHandlers.forEach(finisher => {
        data = String(finisher(data));
    });

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

			redirectErrorPage(res, isNaN(err) ? 404 : err, localPath);

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
    if(!customHandlers.post[pathname]) {
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
            const data = customHandlers.post[pathname](body);

            respond(res, 200, data);
        } catch(err) {
            respond(res, isNan(err) ? 500 : err);
        }
    });
    req.on("error", _ => {
        respond(res, 500);
    });
}

// Create web server instance
http.createServer((req, res) => {
	try {
		handleRequest(req, res);
	} catch(err) {
		console.error(err);
	}
}).listen(webConfig.port, null, null, _ => {
	log("Server started");
});

/**
 * Set up a handler to finish each GET request response data of a certain file extension in a specific manner.
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed a data string to finish returning the eventually send response data. Throwing an error coe leads to a related response.
 */
function finish(extension, callback) {
    extension = extension.trim().replace(/^\./, "");

    !finishHandlers[extension] && (finishHandlers[extension] = []);
    finishHandlers[extension].push(callback);
}

/**
 * Set up a custom route handler for a certain method.
 * @param {String} method Method to bind route to
 * @param {String} pathname Pathname to bind route to
 * @param {Function} callback Callback getting passed the body object of the request returning the eventually send response data
 */
function route(method, pathname, callback) {
	method = String(method).trim().toLowerCase();

	if(!["get", "post"].includes(method)) {
		throw new SyntaxError(`${method.toUpperCase()} is not a supported HTTP method`);
	}

    customHandlers[method][pathname] = callback;
}

/**
 * Get the web file path on disc.
 * @returns {String} Web file path
 */
function getWebPath() {
	return WEB_PATH;
}

module.exports = {
    finish,
	route,
	getWebPath
};