/**
 * Copyright (c) Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

const WEB_PATH = require.main.path;

const webConfig = require("./web-config")(WEB_PATH);
const rateLimiter = require("./rate-limiter");
const log = require("./log")(webConfig.logMessages);

const http = require(webConfig.useHttps ? "https" : "http");


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
		respond(res, 429);

		return;
	}
	// Block request if URL is exceeding the maximum length
	if(req.url.length > webConfig.maxUrlLength) {
		respond(res, 414);

		return;
	}
    
	respond(res, 200, "...");
}

// Create the web server instance
http.createServer(handleRequest).listen(webConfig.port, null, null, _ => {
	log("Server started");
});