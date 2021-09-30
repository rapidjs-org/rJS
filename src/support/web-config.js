const config = {
	configFileName: {
		custom: "rapid.config.json",
		default: "default.config.json",
		dev: "rapid.config.dev.json"
	},
	mimesFileName: {
		custom: "rapid.mimes.json",
		default: "default.mimes.json"
	}
};


const {join, dirname} = require("path");
const {existsSync} = require("fs");


/**
 * Read a custom configuration file and merge it (overriding) with the default configuration file.
 * @returns {Object} Resulting configuration object
 */
const readConfigFile = (defaultName, customNames) => {
	let defaultFile = require(`../static/${defaultName}`);

	customNames = Array.isArray(customNames) ? customNames : [customNames];
	const customFiles = customNames
		.filter(customName => customName)
		.map(customName => {
			return join(dirname(require.main.filename), customName);
		})
		.filter(customFilePath => {
			return existsSync(customFilePath);
		}).map(customFilePath => {
			return require(customFilePath);
		});
	
	for(let subKey in defaultFile) {
		if((defaultFile[subKey] || "").constructor.name !== "Object") {
			continue;
		}

		customFiles.forEach(customFile => {
			if((customFile[subKey] || "").constructor.name !== "Object") {
				return;
			}
			
			customFile[subKey] = {
				...defaultFile[subKey],
				...customFile[subKey]
			};
		});
	}

	customFiles.forEach(customFile => {
		defaultFile = {...defaultFile, ...customFile};
	});
	
	return defaultFile;
};

function normalizeExtensionArray(array) {
	return (Array.isArray(array) && array.length > 0) ? array.map(extension => extension.replace(/^\./, "").toLowerCase()) : undefined;
}


// Read

const webConfig = readConfigFile(config.configFileName.default, [
	config.configFileName.custom,
	require("./is-dev-mode") ? "rapid.config:dev" : null,	// TODO: Deprecate in future
	require("./is-dev-mode") ? config.configFileName.dev : null
]);

webConfig.extensionWhitelist = normalizeExtensionArray(webConfig.extensionWhitelist);
webConfig.gzipCompressList = normalizeExtensionArray(webConfig.gzipCompressList);

const mimesConfig = readConfigFile(config.mimesFileName.default, config.mimesFileName.custom);


module.exports = {
	webConfig,
	mimesConfig
};