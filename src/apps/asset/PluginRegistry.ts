import _config from "./_config.json";


import * as CoreAPI from "../../core/api/api.core";


import Module from "module";
import { readFileSync } from "fs";
import { join } from "path";


type TModuleExports = Record<string, (...args: unknown[]) => unknown>;


interface IPlugin {
    serverModuleReference: TModuleExports;

    clientModuleText?: string;
}


setImmediate(() => {
	CoreAPI.Plugin
	.forEach((plugin: CoreAPI.Plugin) => PluginRegistry.register(plugin));
});


export class PluginRegistry {
    
    private static readonly bareModules: Map<string, string> = new Map();
    private static readonly moduleRegistry: Map<string, IPlugin> = new Map();
    private static readonly globallyEffectivePluginNames: string[] = [];

    public static register(plugin: CoreAPI.Plugin) {
		const moduleObj: IPlugin = this.requireModules(plugin.name, plugin.vfs);

    	this.moduleRegistry.set(plugin.name, moduleObj);

		plugin.config.get(_config.specificIntegrationConfigKey).bool
		&& moduleObj.clientModuleText
		&& PluginRegistry.globallyEffectivePluginNames.push(plugin.name);
    }

    private static requireModules(pluginName: string, pluginVfs: CoreAPI.VFS): IPlugin {
    	if(!pluginVfs.exists(_config.pluginServerModuleName)) return null;
        
    	const serverModuleText: string = pluginVfs.read(_config.pluginServerModuleName).data as string;

    	const moduleReference: Module = new Module("", require.main);
    	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
    	// @ts-ignore
    	moduleReference._compile(serverModuleText, "");

    	const serverModuleReference: TModuleExports = moduleReference.exports;

    	if(!pluginVfs.exists(_config.pluginClientModuleName)) return {
    		serverModuleReference
    	};
        
    	let clientModuleText: string = pluginVfs.read(_config.pluginClientModuleName).data as string;

		if(!clientModuleText.trim().length) return {
			serverModuleReference
		};
        
    	let localRequestMethodId = "req";
    	while(clientModuleText.indexOf(localRequestMethodId) >= 0) {
    		localRequestMethodId = "_" + localRequestMethodId;
    	}

    	clientModuleText = this.produceModuleText("client.plugin", {
    		"NAME": pluginName,
    		"CHANNELED_METHODS": Object.keys(serverModuleReference)
			.map((methodName: string) => `const ${methodName} = (...args) => {
				return ${localRequestMethodId}.apply(null, args);
			}`)
			.join("\n"),
    		"REQUEST_METHOD_ID": localRequestMethodId,
    		"SCRIPT": `${clientModuleText}`
    	});

    	return {
    		serverModuleReference, clientModuleText
    	};
    }

    public static produceModuleText(bareModuleFileName: string, substitutes: Record<string, string>): string {
    	let moduleText: string = PluginRegistry.bareModules.has(bareModuleFileName)
		? PluginRegistry.bareModules.get(bareModuleFileName)
		: String(readFileSync(join(__dirname, "./plugin-modules/", bareModuleFileName.replace(/(\.js)?$/, ".js"))));
		
    	for(const substitute in substitutes) {
    		moduleText = moduleText
    		.replace(new RegExp(`\\/\\*\\*\\* *@${substitute.toUpperCase()} *\\*\\*\\*\\/`, "g"), substitutes[substitute]);
    	}
        
    	PluginRegistry.bareModules.set(bareModuleFileName, moduleText);

    	return moduleText;
    }

    public static getClientModuleText(name: string): string {
    	return this.moduleRegistry.has(name)
    		? this.moduleRegistry.get(name).clientModuleText
    		: null;
    }

    public static getServerModuleReference(name: string): TModuleExports {
    	return this.moduleRegistry.has(name)
    		? this.moduleRegistry.get(name).serverModuleReference
    		: null;
    }

    public static getGloballyEffective(): string[] {
    	return PluginRegistry.globallyEffectivePluginNames;
    }

}