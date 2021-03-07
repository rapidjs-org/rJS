/**
 * Copyright (c) Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

// Local config
const config = {
	defaultExtension: "html",
    defaultFileName: "index",
    webDirName: "web"
};

const {existsSync, readFileSync} = require("fs");
const {extname, join, dirname, basename} = require("path");
const {parse: parseUrl} = require("url");

const WEB_PATH = join(require.main.path, config.webDirName);

const webConfig = require("./web-config")(WEB_PATH);
const rateLimiter = require("./rate-limiter");
const log = require("./log")(webConfig.logMessages);

const http = require(webConfig.useHttps ? "https" : "http");

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
        if(existsSync(`${join(WEB_PATH, errorPagePath)}.${config.defaultExtension}`)) {
            redirect(res, errorPagePath);
            
            return;
        }
    } while(path != "/");

    // Simple response if no related error page found
    respond(res, status);
}

/**
 * Perform a response.
 * @param {*} res Open response object
 * @param {*} status Status code to use
 * @param {*} message Message to use
 */
function respond(res, status, message) {
	// Retrieve default message of status code if none given
	!message && (message = http.STATUS_CODES[status] || "");

	res.statusCode = status;

	res.end(message);
}

/**
 * Handle a single request.
 * @param {*} req Request object
 * @param {*} res Response object
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
    const extension = extname(urlParts.pathname).slice(1);
    // Redirect requests explicitly stating the default extension to a request with an extensionless URL
    if(extension == config.defaultExtension) {
        const newUrl = req.url.slice(0, -((urlParts.search || "").length + extension.length + 1)) + urlParts.search;

        redirect(res, newUrl);

        return;
    }
	// Block request if whitelist enabled and requested extension not whitelisted
	if(extension.length > 0 && webConfig.extensionWhitelist && webConfig.extensionWhitelist.includes(extension)) {
		respondProperly(403);

		return;
	}

	// Set basic response headers
	webConfig.useHttps && (res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains"));
	webConfig.allowFramedLoading && (res.setHeader("X-Frame-Options", "SAMEORIGIN"));

	res.setHeader("X-XSS-Protection", "1");
	res.setHeader("X-Content-Type-Options", "nosniff");

	const method = req.method.toLowerCase();
	if(method == "get") {
		handleGET(res, req.url);
	} else {
		let body = [];
		req.on("data", chunk => {
			body.push(chunk);
		});
		req.on("end", _ => {
            console.log("Body")
			handleOther(res, req.url, JSON.parse(body));
		});
		req.on("error", _ => {
			// Error response
            console.log("No body")
		});
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

function handleGET(res, url) {
    const urlParts = parseUrl(url, true);

    // Strip query string from URL
    ((urlParts.search || "").length > 0) && (url = url.slice(0, -urlParts.search.length));

    // Add default file name if none explicitly stated in the request URL
    if(url.slice(-1) == "/") {
        url += config.defaultFileName;
    }

    // Add default extension if none explicitly stated in the request URL
    if(extname(url).length == 0) {
        url += `.${config.defaultExtension}`;
    }
    
    const localPath = join(WEB_PATH, url);

    // Redirect to the related error page if requested file does not exist
	if(!existsSync(localPath)) {
        redirectErrorPage(res, 404, url);

        return;
    }

    const data = readFileSync(localPath);

	respond(res, 200, data);
}

function handleOther(res, url, body) {
	console.log(body);
	respond(res, 200, "SUCCESS");
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