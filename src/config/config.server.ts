/**
 * Configuration file for server parameter settings.
 */


import { dirname, join } from "path";


import { argument } from "../args";

import { normalizeExtension } from "../utilities/normalize";

import defaultConfig from "./default.config.json";

import { read } from "./reader";


export interface IServerConfig {
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
}


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



const config = (read("config", defaultConfig) || read("server", defaultConfig)) as unknown as IServerConfig;


/**
 * Normalize directory to project local path.
 * @param {string} caption Error section caption
 * @param {string} name Pathname to be normalized
 * @returns {string} Normalized pathname
 */
 function normalizePath(name: string): string {
	const path = (name.charAt(0) != "/")
		? join(projectDirPath, name)
		: name;

	return path;
}

// Normalize directory links (possibly given in relative representation) to local disc absolute
(config.locale.length > 0)
&& (config.directory.lang = normalizePath(config.directory.lang));
config.directory.log && (config.directory.log = normalizePath(config.directory.log));
config.directory.web = normalizePath(config.directory.web);
for(const path in (config.ssl || {})) {
	config.ssl[path] = normalizePath(config.ssl[path]);
}

// Normalize extension arrays for future uniform usage behavior
config.extensionWhitelist = (config.extensionWhitelist || [])
.map(extension => {
    return normalizeExtension(extension);
});

// Normalize MIMEs map object keys (representing file extensions)
const normalizedMimesMap: Record<string, string> = {};
for(const extension in config.mimes) {
	normalizedMimesMap[normalizeExtension(extension)] = config.mimes[extension];
}
config.mimes = normalizedMimesMap;


export default config;