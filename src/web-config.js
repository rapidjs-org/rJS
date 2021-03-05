const {join} = require("path");

const config = {
	configFileName: {
		default: "default.config.json",
		custom: "custom.config.json"
	}
};

/**
 * Read the configuration file and merge it (overriding) with the default configuration.
 * @returns {Object} Resulting configuration object
 */
function read(webPath) {
	const defaultConfig = require(`./${config.configFileName.default}`);

	try {
		const customConfig = require(join(webPath, config.configFileName.custom));
        
		return {...defaultConfig, ...customConfig};
	} catch(err) {
		return defaultConfig;
	}
}

module.exports = read;