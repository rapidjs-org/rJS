import _config from "../../../_config.json";


import { dirname } from "path";

import { TJSONObject } from "../../../_types";

import { Config } from "../Config";

import { VFS } from "./VFS";


/**
 * Class representing both a single plug-in abstraction and
 * a static cumulative management interface providing a
 * comprehensive interface for plug-in implementation within
 * the conrete server application.
 */
export class Plugin {
    
    private static registry: Map<string, Plugin> = new Map();

    public static load() {
        // TODO: Load all plugins from plugin dir into registry
    }

    public static iterate(callback: (plugin: Plugin, name?: string) => void) {
        Plugin.registry.forEach(callback);
    }

    private readonly name: string;
    private readonly config: Config;

    public readonly VFS: VFS;

    constructor(path: string) {
        this.name = dirname(path);
        this.config = new Config(`${this.name}.config`, _config.pluginDirName, Config.global.get("plugins", this.name).object() ?? {});

        this.VFS = new VFS(path);

        Plugin.registry.set(this.name, this);
    }

    public readConfig(...args: unknown[]) {
        return this.config.get.apply(this.config, args);
    }

    public mergeConfigDefault(defaultConfigObj: TJSONObject) {
        this.config.mergeDefault(defaultConfigObj);
    }

}