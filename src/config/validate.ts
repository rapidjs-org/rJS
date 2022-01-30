/**
 * Configuration file validation.
 */


import { existsSync } from "fs";


import serverConfig from "./config.server";


validatePath("log", serverConfig.directory.log);
validatePath("web", serverConfig.directory.web);

(serverConfig.locale.length > 0)
&& validatePath("lang", serverConfig.directory.lang);

for(const path in (serverConfig.ssl || {})) {
	validatePath("SSL", serverConfig.ssl[path]);
}


/**
 * Validate a path for existence.
 * @param {string} caption Error message caption for indicating failing path 
 * @param {string} path Path to check
 */
function validatePath(caption: string, path: string) {
    if(path === undefined) {
        return;
    }

    if(!existsSync(path)) {
        throw new ReferenceError(`Configured ${caption} directory does not exist '${path}'`);
    }
}