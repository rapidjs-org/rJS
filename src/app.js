/**
 * Copyright (c) Thassilo Martin Schiepanski
 * t-ski@GitHub
 */

const {dirname} = require("path");

const WEB_PATH = dirname(require.main.filename);

const webConfig = require("web-config")(WEB_PATH);

const http = require(webConfig.useHttps ? "https" : "http");

//console.log(http.STATUS_CODES[200])

function respond(res, status, message) {
	// Retrieve default message of status code if none given
	!message && (message = http.STATUS_CODES[status]);

	res.statusCode = status;

	res.end(message);
}

/**
 * Handle a single request.
 * @param {*} req Request object
 * @param {*} res Response object
 */
function handleRequest(req, res) {
	if(req.url.length > webConfig.maxUrlLength) {
		respond(res, 414);

		return;
	}

	// ...
	return [req, res];
}

// Create the web server instance
http.createServer(handleRequest).listen(webConfig.port);