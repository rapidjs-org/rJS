/**
 * Configuration file for server parameter settings.
 */


import {normalizeExtension} from "../utilities/normalize";

import defaultConfig from "./default/config.json";

import {read} from "./reader";


interface ICachingDuration {
    client: number;
    server: number;
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
    gzipCompressList: string[];
    maxPayloadSize: number;
    maxRequestsPerMin: number;
    maxUrlLength: number;
    port: IPort
    webDirectory: string;

    allowFramedLoading?: boolean;
    extensionWhitelist?: string[];
    hostname?: string;
    maxPending?: number;
    ssl?: ISSL;
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
config.extensionWhitelist = normalizeExtensionArray(config.extensionWhitelist);
config.gzipCompressList = normalizeExtensionArray(config.gzipCompressList);


export default config;