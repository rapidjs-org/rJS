const {exec} = require("child_process");

module.exports = {

	execCommand: command => {
		return new Promise((resolve, reject) => {
			exec(command, (err, stdout, stderr) => {
				if(err || stderr) {
					reject(err || stderr);
				}
				
				resolve(stdout);
			});
		});
	},

	isString: value => {
		return typeof value === "string" || value instanceof String;
	},
     
	isFunction: value => {
		return value && {}.toString.call(value) === "[object Function]";
	},

	normalizeExtension: extension => {
		return extension.trim().replace(/^\./, "");
	}

};