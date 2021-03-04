const http = require("http");

//console.log(http.STATUS_CODES[200])

/**
 * Handle a single request.
 * @param {*} req Request object
 * @param {*} res Response object
 */
function handleRequest(req, res) {}

// Create the web server instance
http.createServer(handleRequest).listen(7373);