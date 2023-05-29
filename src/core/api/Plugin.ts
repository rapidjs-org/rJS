import _config from "../_config.json";


import { Dirent, existsSync, readdirSync } from "fs";
import { join } from "path";

import { TJSONObject } from "../../types";

import { EmbedContext } from "../EmbedContext";
import { Config } from "../Config";

import { VFS } from "./VFS";


/**
 * Class representing both a single plug-in abstraction and
 * a static cumulative management interface providing a
 * comprehensive interface for plug-in implementation within
 * the conrete server application.
 */
export class Plugin {

    private static pluginsDirPath: string = join(EmbedContext.global.path, _config.pluginsDir);
    private static config: Config = new Config("plugins");
    private static registry: Map<string, Plugin> = new Map();

    public static forEach(loopCallback: ((plugin: Plugin) => void)) {
        this.registry.forEach(loopCallback);
    }

    public static load() {
        if(!existsSync(Plugin.pluginsDirPath)) return;

        readdirSync(Plugin.pluginsDirPath, {
            withFileTypes: true
        })
        .forEach((dirent: Dirent) => {
            if(!dirent.isDirectory()) return;

            new Plugin(dirent.name)
        });
    }

    private readonly name: string;

    public readonly config: Config;
    public readonly VFS: VFS;

    constructor(name: string) {
        this.name = name;

        const subConfigObj: TJSONObject = Plugin.config.get(this.name).object();
        this.config = subConfigObj ? new Config(subConfigObj) : null;
        this.VFS = new VFS(join(Plugin.pluginsDirPath, name));

        Plugin.registry.set(this.name, this);
    }

}