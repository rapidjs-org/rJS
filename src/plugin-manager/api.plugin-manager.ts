// TODO: Plug-in manager application

// • Install from repo
// • ...

// Store references in package.json? or sepcific file?


import _config from "./_config.json";


import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

import { TJSONObject } from "../types";
import { Args } from "../Args";
import { EmbedContext } from "../EmbedContext";


export function install() {
	const pluginReference = Args.global.parsePositional(1);

	if(!pluginReference) throw new ReferenceError("Missing plug-in reference (arg pos 1)");

	// TODO: Implement
}


function writePluginToPackageJSON(pluginName: string, version: string) {
	const packageJSONObj: TJSONObject = readPackageJSON();

	const subObj = packageJSONObj[_config.packagePluginsKey] as TJSONObject;
	subObj[pluginName] = version;
	packageJSONObj[_config.packagePluginsKey] = subObj;

	writeFileSync(join(EmbedContext.global.path, "package.json"), JSON.stringify(packageJSONObj));
}

function installPluginsFromPackageJSON() {
	const packageJSONObj: TJSONObject = readPackageJSON();
    
	const installationDict: TJSONObject = packageJSONObj[_config.packagePluginsKey] as TJSONObject;
	for(const plugin in installationDict) {
		// TODO: Install 'installationDict[plugin]'
	}
}

function readPackageJSON(): TJSONObject {
	const packageJSONPath: string = join(EmbedContext.global.path, "package.json");

	return existsSync(packageJSONPath)
		? JSON.parse(String(readFileSync(packageJSONPath)))
		: {};
}