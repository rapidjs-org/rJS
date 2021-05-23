const config = {
	appName: "rJS"
};

function out(message, style) {
	console.log(`\x1b[33m%s${style ? `${style}%s\x1b[0m` : "\x1b[0m%s"}`, `[${config.appName}] `, message);
}

/**
 * Return log message or an empty function if logging disabled.
 * @param {Boolean} isEnabled Whether console output is enabled
 */
module.exports = isEnabled => {
	if(!isEnabled) {
		return _ => {};
	}

	/**
	 * Log a message to the console.
	 * @param {String} message Message
	 */
	const log = message => {
		out(message);
	};
	
	/**
	 * Log a message to the console.
	 * @param {String} message Message
	 */
	const error = err => {
		if(!isNaN(err)) {
			// Do not log thrown status error used for internal redirect
			return;
		}
		
		out(` ${err.name}: "${err.message}"${(err.fileName && err.lineNumber) ? ` at ${err.fileName}:${err.lineNumber}` : ""} `, "\x1b[41m\x1b[37m");
		console.log(err);
	};

	return {
		log,
		error
	};
};