/**
 * Retrieve web file (public) directory path on local disc.
 */


import {dirname, join} from "path";

import {argument} from "../args";


const callDirPath: string = dirname(require.main.filename);
const projectDirPath: string|boolean = argument("path");

// Use directory at given path (argument)
// or call point directory otherwise
export default (typeof(projectDirPath) == "string")
// Construct absolute path from call point if relative path given
? (/[^/]/.test(projectDirPath)
	? join(callDirPath, projectDirPath)
	: projectDirPath)
: callDirPath;