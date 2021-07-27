const ClientError = require("../interface/ClientError");


const config = {
	appName: "rJS"
};

function out(message, style) {
	console.log(`\x1b[33m%s${style ? `${style}%s\x1b[0m` : "\x1b[0m%s"}`, `[${config.appName}] `, message);
}

module.exports = {
	/**
	 * Log a message to the console.
	 * @param {String} message Message
	 */
	log: message => {
		out(message);
	},
	
	/**
	 * Log an error to the console.
	 * @param {Error} err Error object
	 * @param {Boolean} [terminate=false] Whether to terminate application execution after error logging
	 */
	error: (err, terminate = false) => {
		if(err instanceof ClientError) {
			// Do not log thrown status error as of manipulation interface usage
			return;
		}

		let message = (err instanceof Error) ? `${err.name}: ${err.message}${(err.fileName && err.lineNumber) ? ` at ${err.fileName}:${err.lineNumber}` : ""}` : err;
		out(`${message}`, "\x1b[41m\x1b[37m");

		console.error(err);
		
		if(terminate) {
			process.exit();
		}
	}
};