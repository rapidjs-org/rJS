/**
 * Configuration file for explicit MIME type declarations.
 */

import {read} from "./reader";


export default read("mimes") as Record<string, string>;