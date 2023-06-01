import _config from "../_config.json";


import { Dirent, existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

import { TJSONObject } from "../../types";

import { EmbedContext } from "../EmbedContext";
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

    public static forEach(loopCallback: ((plugin: Plugin) => void)) {
        this.registry.forEach(loopCallback);
    }

    public static load() {
        const pluginsDirPath: string = join(EmbedContext.global.path, _config.pluginsDir);

        if(!existsSync(pluginsDirPath)) return;

        readdirSync(pluginsDirPath, {
            withFileTypes: true
        })
        .forEach((dirent: Dirent) => {
            if(!dirent.isDirectory()) return;
            
            if(!PLUGIN_NAME_REGEX.test(dirent.name)) {
                throw new SyntaxError(`Invalid plug-in name '${dirent.name}'`);
            }   // TODO: From package, too

            new Plugin(dirent.name)
        });
    }

    public readonly name: string;
    public readonly config: Config;
    public readonly vfs: VFS;

    constructor(name: string) {
        this.name = name;

        const subConfigObj: TJSONObject = Plugin.config.get(this.name).object();
        this.config = subConfigObj ? new Config(subConfigObj) : null;
        this.vfs = new VFS(join(_config.pluginsDir, name));

        Plugin.registry.set(this.name, this);
    }

}