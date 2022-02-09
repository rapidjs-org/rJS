/**
 * Configuration file for server parameter settings.
 */


import { dirname, join } from "path";
import { existsSync } from "fs";


import { argument } from "../args";

import { output } from "../utilities/output";
import { normalizeExtension } from "../utilities/normalize";

import { read } from "./reader";
import defaultConfig from "./config.default.json";


interface IServerConfig {
    cachingDuration: {
        client: number;
        server: number;
    };
    directory: {
        lang: string;
        log: string;
        web: string;
    };
    gzipCompression: boolean;
    limit: {
        payloadSize: number;
        requestsPerMin: number;
        urlLength: number;
        
        requestsPending?: number;
    };
    locale: (string|{
        language: string;
        countries?: string[];
    })[];
    mimes: Record<string, string>,
    port: {
        http: number;
        
        https?: number;
    }

    allowFramedLoading?: boolean;
    concealing404?: boolean;
    extensionWhitelist?: string[];
    hostname?: string;
    ssl?: {
        certFile?: string,
        dhParam?: string,
        keyFile?: string
    };
    www?: string;
};


// Retrieve web file (public) directory path on local disc
const callDirPath: string = dirname(process.argv[1]);
const argsDirPath: string|boolean = argument("path");
// Use directory at given path (argument)
// or call point directory otherwise
const projectDirPath = (typeof(argsDirPath) == "string")
// Construct absolute path from call point if relative path given
	? (/[^/]/.test(argsDirPath)
		? join(callDirPath, argsDirPath)
		: argsDirPath)
	: callDirPath;


export const serverConfig = (read("config", defaultConfig) || read("server", defaultConfig)) as unknown as IServerConfig;


/**
 * Project locally normalize and validate configuration path.
 * Aborts start-up if given a non-existing path.
 * @param {string} caption Error section caption
 * @param {Object} path Path property
 */
 function validatePath(caption: string, path) {
    if(!path) {
        return undefined;
    }

	path = (path.charAt(0) != "/")
		? join(projectDirPath, path)
		: path;
    
    if(!existsSync(path)) {
        new ReferenceError(`Configured ${caption} directory does not exist '${path}'`);
    }

    return path;
}

serverConfig.directory.log = validatePath("log", serverConfig.directory.log);
serverConfig.directory.web = validatePath("web", serverConfig.directory.web);
serverConfig.directory.lang = (serverConfig.locale.length > 0)
? validatePath("lang", serverConfig.directory.lang)
: undefined;


// Normalize extension arrays for future uniform usage
serverConfig.extensionWhitelist = (serverConfig.extensionWhitelist || [])
.map(extension => {
    return normalizeExtension(extension);
});


// Normalize MIMEs map object keys (representing file extensions)
const normalizedMimesMap: Record<string, string> = {};
for(const extension in (serverConfig.mimes as Record<string, string>)) {
	normalizedMimesMap[normalizeExtension(extension)] = serverConfig.mimes[extension];
}
serverConfig.mimes = normalizedMimesMap;