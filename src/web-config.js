const config = {
	configFileName: {
		default: "default.config.json",
		custom: "rapid.config.json"
	}
};

const {join, dirname} = require("path");

/**
 * Read the configuration file and merge it (overriding) with the default configuration.
 * @returns {Object} Resulting configuration object
 */
function read(webPath) {
	const defaultConfig = require(`./${config.configFileName.default}`);

	try {
		const customConfig = require(join(dirname(webPath), config.configFileName.custom));
		
		return {...defaultConfig, ...customConfig};
	} catch(err) {
		console.log(err)
		return defaultConfig;
	}
}

module.exports = read;