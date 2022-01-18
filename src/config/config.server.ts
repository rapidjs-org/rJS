/**
 * Configuration file for server parameter settings.
 */


import {dirname, join} from "path";
import {existsSync} from "fs";

import {argument} from "../args";

import {normalizeExtension} from "../utilities/normalize";

import defaultConfig from "./default.config.json";

import {read} from "./reader";


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
    gzipCompressList: string[];
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


/**
 * Normalize directory to project local path.
 * @param {string} caption Error section caption
 * @param {string} name Pathname to be normalized
 * @returns {string} Normalized pathname
 */
function normalizePath(caption: string, name: string): string {
	const path = (name.charAt(0) != "/")
		? join(projectDirPath, name)
		: name;
    
	if(!existsSync(path)) {
console.log(path);

		throw new ReferenceError(`${caption} directory given in server configuration file does not exist '${path}'`);
	}

	return join(projectDirPath, name);
}

/**
 * Normalize array of extension names as given to several server configuration parameters.
 * Removes possibly given leading dots as well as translates strings to lowercase represenatation.
 * @param {string[]} array Extension name array
 * @returns Normalized extensions array
 */
function normalizeExtensionArray(array: string[]) {
	return (array || []).map(extension => {
		return normalizeExtension(extension);
	});
}


const config = (read("config", defaultConfig) || read("server", defaultConfig)) as unknown as IServerConfig;


// Normalize directory links (possibly given in relative representation) to local disc absolute
(config.locale.length > 0)
&& (config.directory.lang = normalizePath("Lang", config.directory.lang));
config.directory.log && (config.directory.log = normalizePath("Log", config.directory.log));
config.directory.web = normalizePath("Web", config.directory.web);

// Normalize extension arrays for future uniform usage behavior
config.extensionWhitelist = normalizeExtensionArray(config.extensionWhitelist);
config.gzipCompressList = normalizeExtensionArray(config.gzipCompressList);

// Normalize MIMES map object keys (representing file extensions)
const normalizedMimesMap: Record<string, string> = {};
for(const extension in config.mimes) {
	normalizedMimesMap[normalizeExtension(extension)] = config.mimes[extension];
}
config.mimes = normalizedMimesMap;


// TODO: Type check

export default config;