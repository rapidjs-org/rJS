import * as CoreAPI from "../../core/api/api.core";


import { join } from "path";


interface IPlugin {
    serverModuleReference: unknown;
    clientModuleText: string;
}


export class PluginRegistry {
    
    private static readonly registry: Map<string, IPlugin> = new Map();

    public static register(plugin: CoreAPI.Plugin) {
        this.registry.set(plugin.name, {
            serverModuleReference: this.requireServerModule(plugin.vfs),
            clientModuleText: ""    // TODO: Implement
        });
    }

    public static retrieve(plugin: CoreAPI.Plugin) {
        
    }

    private static requireServerModule(pluginVfs: CoreAPI.VFS): unknown {
        return null;
    }

}


CoreAPI.Plugin
.forEach((plugin: CoreAPI.Plugin) => PluginRegistry.register(plugin));