import _config from "../_config.json";


import { Dirent, existsSync, readdirSync } from "fs";
import { join, basename } from "path";

import { TJSONObject } from "../../types";

import { EmbedContext } from "../../EmbedContext";
import { Config } from "../Config";

import { VFS } from "./VFS";
import { PLUGIN_NAME_REGEX } from "./PLUGIN_NAME_REGEX";


/**
 * Class representing both a single plug-in abstraction and
 * a static cumulative management interface providing a
 * comprehensive interface for plug-in implementation within
 * the conrete server application.
 */
export class Plugin {

    private static readonly config: Config = new Config("plugins");
    private static readonly registry: Map<string, Plugin> = new Map();

	private static loadFromPath(path: string, includeIdentifierLevels: boolean = true) {
    	const pluginsDirPath: string = join(EmbedContext.global.path, path);

    	if(!existsSync(pluginsDirPath)) return;

    	readdirSync(pluginsDirPath, {
    		withFileTypes: true
    	})
    	.forEach((dirent: Dirent) => {
    		if(!dirent.isDirectory()) return;
			
			const subPath: string = join(path, dirent.name);
			
			if(includeIdentifierLevels && /^@[a-z0-9-][a-z0-9_-]{0,213}$/.test(dirent.name)) {
				Plugin.loadFromPath(subPath, false);
				
				return;
			}
			
    		new Plugin(!includeIdentifierLevels ? `${basename(path)}/${dirent.name}` : dirent.name, subPath);
    	});
	}
	
    public static forEach(loopCallback: ((plugin: Plugin) => void)) {
    	this.registry.forEach(loopCallback);
    }

    public static load() {
		Plugin.loadFromPath(_config.installedPluginsPath);
		Plugin.loadFromPath(_config.localPluginsPath);
    }

    public readonly name: string;
    public readonly config: Config;
    public readonly vfs: VFS;

    constructor(name: string, path: string) {
    	if(!new RegExp(`^${PLUGIN_NAME_REGEX.source}$`).test(name)) {
    		throw new SyntaxError(`Invalid plug-in name '${name}'`);
    	}

    	this.name = name;

    	const subConfigObj: TJSONObject = Plugin.config.get(this.name).object();
    	this.config = new Config(subConfigObj ?? {});
    	this.vfs = new VFS(path);

    	Plugin.registry.set(this.name, this);
    }

}