const {join} = require("path");

const config = {
	"configFileName": {
		"default": "default.config.json",
		"custom": "custom.config.json"
	}
};

/**
 * Read the configuration file and merge it (overriding) with the default configuration.
 * @returns {Object} Resulting configuration object
 */
function read(webPath) {
	const defaultConfig = require(`./${config.configFileName.default}`);
	const customConfig = require(join(webPath, config.configFileName.custom));
    
	return {...defaultConfig, ...customConfig};
}

module.exports = read;