const config = {
	appName: "rapid"
};

/**
 * Log a message to the console.
 * @param {String} message Message
 */
 function log(message) {
	console.log(`[${config.appName}] ${message}`);
}

/**
 * Log a message to the console.
 * @param {String} message Message
 */
function error(err) {
	if(!isNaN(err)) {
		// Do not log thrown status error used for internal redirect
		return;
	}

	log("An internal server error occured:");
	console.error(err);
}

// TODO: Process error implicitly

/**
 * Return log message or an empty function if logging disabled.
 * @param {Boolean} isEnabled Whether console output is enabled
 */
module.exports = isEnabled => {
	if(!isEnabled) {
		return _ => {};
	}

	return {
		log,
		error
	};
};