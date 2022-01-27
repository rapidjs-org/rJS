/**
 * Configuration file validation.
 */


import {existsSync} from "fs";


import serverConfig from "./config.server";


validatePath("lang", serverConfig.directory.lang);
validatePath("log", serverConfig.directory.log);
validatePath("web", serverConfig.directory.web);

for(const path in (serverConfig.ssl || {})) {
	validatePath("SSL", serverConfig.ssl[path]);
}


function validatePath(caption: string, path: string) {
    if(!existsSync(path)) {
        throw new ReferenceError(`Configured ${caption} directory does not exist '${path}'`);
    }
}