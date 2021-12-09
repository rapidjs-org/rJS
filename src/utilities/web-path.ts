/**
 * Retrieve web file (public) directory path on local disc.
 */


import {join} from "path";
import {existsSync} from "fs";

import serverConfig from "../config/config.server";

import * as output from "./output";
import projectDirPath from "./project-path";


const webDirName = serverConfig.webDirectory;
if(webDirName.match(/[<>:"/\\|?*]/)) {
	output.error(
		new SyntaxError(`'${webDirName}' is not a valid directory name. Contains disallowed characters from {<, >, :, ", /, \\, ,|, ?, *}.`),
		true);
}

const webDirPath = join(projectDirPath, webDirName);
if(!existsSync(webDirPath)) {
	output.error(
		new ReferenceError(`Web file directory does not exist at '${webDirPath}'`),
		true);
}


export default webDirPath;