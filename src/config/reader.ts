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
 * 2 level deep merge objects with right associative override.
 * @param {Object} obj1 Object 1
 * @param {Object} obj2 Object 2 (overriding)
 * @returns {Object} Merged object.
 */
 function merge(obj1: Object, obj2: Object): Object {
	// Explicitly merge sub objects
	for(const key in obj1) {
		if((obj1[key] || "").constructor.name !== "Object"
        || (obj2[key] || "").constructor.name !== "Object") {
			continue;   // No sub objects for both objects given
		}
    
		obj2[key] = {
			...obj1[key],
			...obj2[key]
		};
	}

	return {...obj1, ...obj2}; // Merge top level
}

/**
 * Read a custom config file
 * @param {string} name Configuration file name (formatted)
 * @param {boolean} [devConfig] Whether to read DEV MODE specific file (with suffix) 
 * @returns {Object} Configuration object
 */
function readCustomConfig(name: string, devConfig: boolean = false): Object {
	// Retrieve custom config object (depending on mode)
	const customConfigPath = join(dirname(require.main.filename),
		`${config.filePrefix}${name}${devConfig ? config.devSuffix : ""}.json`);
	
	return existsSync(customConfigPath) ? require(customConfigPath) : {};
}

/**
 * Read an merge configuration files/objects respectively (2 levels deep).
 * @param {string} name Configuration file name (formatted)
 * @param {Object} [defaultConfig] Default configuration object
 * @returns {Object} Resulting configuration object
 */
export function read(name: string, defaultConfig: Object = {}) {
	// Retrieve custom config object (depending on mode)
	const customConfig = merge(readCustomConfig(name),
	isDevMode ? readCustomConfig(name, true) : {});

	return merge(defaultConfig, customConfig);
}