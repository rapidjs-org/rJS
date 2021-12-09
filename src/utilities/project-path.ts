/**
 * Retrieve web file (public) directory path on local disc.
 */


import {dirname} from "path";

import {argument} from "../args";


const projectDirPath: string|boolean = argument("path");


export default projectDirPath
? projectDirPath
: dirname(require.main.filename);