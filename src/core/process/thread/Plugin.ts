import _config from "../../../_config.json";


import { dirname } from "path";

import { Config } from "../Config";


/**
 * Class representing both a single plug-in abstraction and
 * a static cumulative management interface providing a
 * comprehensive interface for plug-in implementation within
 * the conrete server application.
 */
export class Plugin {
    
    public static registry: Map<string, Plugin> = new Map();

    private readonly name: string;
    private readonly config: Config;

    constructor(path: string) {
        this.name = this.resolveName(path);
        this.config = new Config(`${this.name}.config`, _config.pluginDirName, Config.global.get("plugins", this.name).object() ?? {});

        Plugin.registry.set(this.name, this);
    }

    private resolveName(path: string) {
        return dirname(path);
    }

}