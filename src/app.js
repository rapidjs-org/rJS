/**
 * Copyright (c) Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

// Local config
const config = {
	defaultExtensionName: "html",
	defaultFileName: "index",
	webDirName: "web"
};

const {existsSync, readFileSync} = require("fs");
const {extname, join, dirname} = require("path");
const {parse: parseUrl} = require("url");

const WEB_PATH = join(require.main.path, config.webDirName);

const webConfig = require("./web-config")(WEB_PATH);

const utils = require("./utils");
const rateLimiter = require("./rate-limiter");
const cache = require("./cache");
const log = require("./log")(webConfig.logMessages);

const mimeTypes = require("./mime-types");

const http = require(webConfig.useHttps ? "https" : "http");

// Request finisher storage object
let finishers = {};

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
	const urlParts = parseUrl(req.url, true);
	// Redirect requests explicitly stating the default file or extension name to a request with an extensionless URL
	if(urlParts.pathname.match(new RegExp(`(${config.defaultFileName})?(\\.${config.defaultExtensionName})?$`))[0].length > 0) {
		const newUrl = urlParts.pathname.replace(new RegExp(`(${config.defaultFileName})?(\\.${config.defaultExtensionName})?$`), "")
                     + (urlParts.search || "");
        
		redirect(res, newUrl);

		return;
	}
	// Block request if whitelist enabled and requested extension not whitelisted
	const extension = extname(urlParts.pathname).slice(1);
	if(extension.length > 0 && webConfig.extensionWhitelist && webConfig.extensionWhitelist.includes(extension)) {
		respondProperly(403);

		return;
	}

	// Set basic response headers
	webConfig.useHttps && (res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	res.setHeader("X-XSS-Protection", "1");
	res.setHeader("X-Content-Type-Options", "nosniff");

	const mime = mimeTypes[(extension.length > 0) ? extension : config.defaultExtensionName];
	mime && res.setHeader("Content-Type", mime);

	const method = req.method.toLowerCase();
	if(method == "get") {
		handleGET(res, req.url);
	} else {
		handleOther(res, req);
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
 * @param {String} url Request URL
 */
function handleGET(res, url) {
	const urlParts = parseUrl(url, true);

	if(cache.has(urlParts.pathname, webConfig.cacheRefreshFrequency)) {
		// Read data from cache if exists (and not outdated)
		respond(res, 200, cache.read(url));

		return;
	}

	let localPath = join(WEB_PATH, urlParts.pathname);

	if(localPath.slice(-1) == "/") {
		// Add default file name if none explicitly stated in the request URL
		localPath += config.defaultFileName;
	}
    let extension = extname(localPath).slice(1);
	if(extname(localPath).length == 0) {
		// Add default extension if none explicitly stated in the request URL
		localPath += `.${config.defaultExtensionName}`;

        extension = config.defaultExtensionName;
	}
	if(!existsSync(localPath)) {
		// Redirect to the related error page if requested file does not exist
		redirectErrorPage(res, 404, url);

		return;
	}

	let data = String(readFileSync(localPath));

    // Finisher calls
    (finishers[extension] || []).forEach(finisher => {
        data = finisher(data);
    });

	cache.write(url, data);

	respond(res, 200, Buffer.from(data, "UTF-8"));
}

/**
 * Handle any request type other than GET accordingly.
 * @param {Object} res Active response object
 * @param {Object} req Active request object
 */
function handleOther(res, req) {
    let blockBodyProcessing;
    let body = [];
    req.on("data", chunk => {
        body.push(chunk);

        const bodyByteSize = (JSON.stringify(JSON.parse(body)).length * 8);
        if(bodyByteSize > webConfig.maxPayloadBytes) {
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

	    respond(res, 200, "SUCCESS");
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
 * Finish GET request response dataof a certain file extension specificly.
 * @param {String} extension Extension name (without a leading dot) 
 * @param {Function} callback Callback getting passed a data string to finish returning the eventually send response data
 */
function finish(extension, callback) {
    extension = extension.trim().replace(/^\./, "");

    !finishers[extension] && (finishers[extension] = []);
    finishers[extension].push(callback);
}

module.exports = {
    finish
};