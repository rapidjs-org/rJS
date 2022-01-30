/**
 * Configuration file reader.
 */

const config = {
	filePrefix: "rapid.",
	devSuffix: ".dev"
};


import { join, dirname } from "path";
import { existsSync } from "fs";

import {mode} from "../utilities/mode";
import { merge } from "../utilities/object";


/**
 * Read a custom config file
 * @param {string} name Configuration file name (formatted)
 * @param {boolean} [devConfig] Whether to read DEV MODE specific file (with suffix) 
 * @returns {Object} Configuration object
 */
function readCustomConfig(name: string, devConfig = false): Record<string, unknown> {
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
export function read(name: string, defaultConfig: Record<string, unknown> = {}) {
	// Retrieve custom config object (depending on mode)
	const customConfig = merge(readCustomConfig(name),
		mode.DEV ? readCustomConfig(name, true) : {});

	return merge(defaultConfig, customConfig);
}