// TODO: Plug-in manager application

// • Install from repo
// • ...

// Store references in package.json? or sepcific file?


import _config from "./_config.json";


import { join } from "path";
import { existsSync, readFileSync } from "fs";

import { TJSONObject } from "../types";
import { Args } from "../Args";
import { EmbedContext } from "../EmbedContext";


export function install() {
    const pluginReference = Args.global.parsePositional(1);

    if(!pluginReference) throw new ReferenceError("Missing plug-in reference (arg pos 1)");

    // TODO: Implement
}


function writePluginToPackageJSON(pluginName: string, version: string) {
    const packageJSONPath: string = join(EmbedContext.global.path, "package.json");
    const packageJSONObj: TJSONObject = existsSync(packageJSONPath)
    ? JSON.parse(String(readFileSync(packageJSONPath)))
    : {};

    const subObj = packageJSONObj[_config.packagePluginsKey] as TJSONObject;
    packageJSONObj[_config.packagePluginsKey] = {
        ...subObj,

        
    };
}