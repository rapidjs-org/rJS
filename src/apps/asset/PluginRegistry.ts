import _config from "./_config.json";


import * as CoreAPI from "../../core/api/api.core";


import Module from "module";
import { readFileSync } from "fs";
import { join } from "path";


interface IPlugin {
    serverModuleReference: Module;

    clientModuleText?: string;
}


setImmediate(() => {
    CoreAPI.Plugin
    .forEach((plugin: CoreAPI.Plugin) => PluginRegistry.register(plugin));
});


export class PluginRegistry {
    
    private static readonly registry: Map<string, IPlugin> = new Map();

    public static register(plugin: CoreAPI.Plugin) {
        this.registry.set(plugin.name, this.requireModules(plugin.name, plugin.vfs));
    }

    private static requireModules(pluginName: string, pluginVfs: CoreAPI.VFS): IPlugin {
        if(!pluginVfs.exists(_config.pluginServerModuleName)) return null;
        
        const serverModuleText: string = pluginVfs.read(_config.pluginServerModuleName).data as string;
        console.log(serverModuleText)
        
        const moduleReference: Module = new Module("", require.main);
        // @ts-ignore
        moduleReference._compile(serverModuleText, "");

        const serverModuleReference: Module = moduleReference.exports;

        if(!pluginVfs.exists(_config.pluginClientModuleName)) return {
            serverModuleReference
        };

        let clientModuleText: string = pluginVfs.read(_config.pluginClientModuleName).data as string;
        
        clientModuleText = this.produceModuleText("client.plugin", {
            "NAME": pluginName,
            "SCRIPT": `${clientModuleText}`
        });
        console.log(clientModuleText)
        
        return {
            serverModuleReference, clientModuleText
        };
    }

    private static produceModuleText(bareModuleFileName: string, substitutes: Record<string, string>): string {
        let moduleText: string = String(readFileSync(join(__dirname, "./plugin-modules/", bareModuleFileName.replace(/(\.js)?$/, ".js"))));

        for(let substitute in substitutes) {
            moduleText = moduleText
            .replace(new RegExp(`\\/\\*\\*\\* *@${substitute.toUpperCase()} *\\*\\*\\*\\/`, "g"), substitutes[substitute]);
        }

        return moduleText;
    }

    public static getClientModuleText(name: string): string {
        return this.registry.get(name).clientModuleText;
    }

    public static getServerModuleReference(name: string): Module {
        return this.registry.get(name).serverModuleReference;
    }

}