function respond(entity, status, message) {
	entity.res.statusCode = isNaN(status) ? 500 : status;
    
	// Retrieve default message of status code if none given
	!message && (message = require("http").STATUS_CODES[entity.res.statusCode] || "");
    
	entity.res.setHeader("Content-Length", Buffer.byteLength(message));
	
	entity.res.end(isNaN(status) ? null : message);
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


module.exports = {
	respond,
	redirect
};