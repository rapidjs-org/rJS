/**
 * Configuration file for explicit MIME type declarations.
 */


import defaultConfig from "./default/mimes.json";

import {normalizeExtension} from "../utilities/normalize";

import {read} from "./reader";


const config = read("mimes", defaultConfig) as Record<string, string>;

// Normalize extension keys
const normalizedConfig: Record<string, string> = {};
for(const extension in config) {
    normalizedConfig[normalizeExtension(extension)] = config[extension]);
}


export default normalizedConfig;