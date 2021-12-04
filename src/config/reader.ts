/**
 * Configuration file reader.
 */

const config = {
	filePrefix: "rapid.",
	devSuffix: ".dev"
};


import {join, dirname} from "path";
import {existsSync} from "fs";

import isDevMode from "../utilities/is-dev-mode";


/**
 * Read an merge configuration files/objects respectively (2 levels deep).
 * @param {string} name Configuration file name (formatted)
 * @returns {Object} Resulting configuration object
 */
export function read(name: string) {
	// Retrieve default config object
	const defaultConfigPath = join(__dirname, `./default/${name}.json`);
	const defaultConfig = existsSync(defaultConfigPath) ? require(defaultConfigPath) : {};

	// Retrieve custom config object (depending on mode)
	const customConfigPath = join(dirname(require.main.filename),
		`${config.filePrefix}${name}${isDevMode ? config.devSuffix : ""}.json`);
	const customConfig = existsSync(customConfigPath) ? require(customConfigPath) : {};
	
	// Explicitly merge sub objects
	for(const key in defaultConfig) {
		if((defaultConfig[key] || "").constructor.name !== "Object"
        || (customConfig[key] || "").constructor.name !== "Object") {
			continue;   // No sub objects for both objects given
		}
    
		customConfig[key] = {
			...defaultConfig[key],
			...customConfig[key]
		};
	}

	return {...defaultConfig, ...customConfig}; // Merge top level
}