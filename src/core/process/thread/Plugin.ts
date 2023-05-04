import _config from "../../../_config.json";


import { dirname, join } from "path";
import { readFileSync } from "fs";

import { Config } from "../Config";


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

    private readonly path: string;
    private readonly name: string;
    private readonly config: Config;

    constructor(path: string) {
        this.path = path;
        this.name = dirname(path);
        this.config = new Config(`${this.name}.config`, _config.pluginDirName, Config.global.get("plugins", this.name).object() ?? {});

        Plugin.registry.set(this.name, this);
    }

    public readFile(name: string): string {
        return String(readFileSync(join(this.path, /\.[a-z][a-z0-9]*$/i.test(name) ? name : `${name}.js`)));
    }

    public readConfig(...args: unknown[]) {
        return this.config.get.apply(this.config, args);
    }

}