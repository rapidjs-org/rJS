/**
 * Configuration file for explicit MIME type declarations.
 */


import defaultConfig from "./default/mimes.json";

import {read} from "./reader";


export default read("mimes", defaultConfig) as Record<string, string>;