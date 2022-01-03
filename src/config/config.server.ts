/**
 * Configuration file for server parameter settings.
 */


import {dirname, join} from "path";
import {existsSync} from "fs";

import {argument} from "../args";

import {normalizeExtension} from "../utilities/normalize";

import defaultConfig from "./default/config.json";
import {read} from "./reader";


interface ICachingDuration {
    client: number;
    server: number;
}

interface IDirectory {
    lang: string;
    log: string;
    web: string;
}

interface ILocale {
    implicitDefaults: boolean;

    defaultLang?: string;
    defaultCountry?: string;
}

interface IPort {
    http: number;
    
    https?: number;
}

interface ISSL {
    certFile?: string,
    dhParam?: string,
    keyFile?: string
}

export interface IServerConfig {
    cachingDuration: ICachingDuration;
    directory: IDirectory;
    gzipCompressList: string[];
    maxPayloadSize: number;
    maxRequestsPerMin: number;
    maxUrlLength: number;
    port: IPort

    allowFramedLoading?: boolean;
    extensionWhitelist?: string[];
    hostname?: string;
    locale?: ILocale;
    maxPending?: number;
    ssl?: ISSL;
    www?: string;
}

// Retrieve web file (public) directory path on local disc.
const callDirPath: string = dirname(require.main.filename);
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
 */
function normalizePath(caption: string, name: string): string {
    const path = (name.charAt(0) != "/")
    ? join(projectDirPath, name)
    : name;

    if(!existsSync(path)) {
        throw new ReferenceError(`${caption} directory does not exist '${path}'`);
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


const config = read("config", defaultConfig) as IServerConfig;

// Normalize extension arrays for future uniform usage behavior
config.directory.log && (config.directory.log = normalizePath("Log", config.directory.log));
config.directory.lang = normalizePath("Lang", config.directory.lang);
config.directory.web = normalizePath("Web", config.directory.web);

// Normalize extension arrays for future uniform usage behavior
config.extensionWhitelist = normalizeExtensionArray(config.extensionWhitelist);
config.gzipCompressList = normalizeExtensionArray(config.gzipCompressList);


export default config;