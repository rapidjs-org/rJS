/**
 * Class representing a plugin.
 * Statically managing all plugins for environmental connection
 * as well as dynamic file related referencing.
 */

const config = {
	configFilePluginScopeName: "plugin",
	coreModuleIdentifier: "core",
	pluginConfigIdentifier: "pluginConfig",
	clientModuleAppName: "rapidJS",
	clientModuleReferenceName: {
		shared: "SHARED",
		public: "PUBLIC"
	},
	pluginNameRegex: /(@[a-z0-9+-][*a-z0-9._-]*\/)?[a-z0-9+-][a-z0-9._-]*/,
	pluginNameSeparator: "+",
	pluginRequestPrefix: "plug-in::",
	thisRetainerIdentifier: "$this"
};


const Module = require("module");   // for runtime dynamic module wrapping

import { join, dirname, extname } from "path";
import { existsSync, readFileSync } from "fs";


import { pluginConfig } from "../../config/config.plugins";

import { registerDetection } from "../../live/detection";

import { output } from "../../utilities/output";
import { injectIntoHead } from "../../utilities/markup";
import { truncateModuleExtension } from "../../utilities/normalize";


// Plugin name regex.
const pluginNameRegex = new RegExp(`^${config.pluginNameRegex.source}$`, "i");
// Plugin request URL prefix regex.
const urlPrefixRegex = new RegExp(`^\\/${config.pluginRequestPrefix}`, "i");


export class Plugin {
    public static readonly registry: Map<string, {
        path: string;
        specific: boolean;

        clientScript?: Buffer;
        compoundOnly?: boolean;
    }> = new Map();

    /**
     * Get path to plugin module that activated calling function.
     * @param {string} fileName Name of current file for checking against (use __filename)
     * @returns {string} Plugin module source path for traversal reference
     */
    private static getCallerPath(fileName: string): string {
        const err = new Error();
        
        Error.prepareStackTrace = (_, stack) => {
            return stack;
        };

        while(err.stack.length) {
            // @ts-ignore
            if(![fileName || "", __filename].includes(err.stack.shift().getFileName())) {
                // @ts-ignore
                return err.stack.shift().getFileName();
            }
        }
        
        throw new ReferenceError("Failed to retrieve path to plugin caller module");
    }

    /**
     * Get a plugin name by reference (dependency identifier or file system path).
     * Name derivation strategy:
     * Use dependency identifier if given
     * Use package name if exists at given path
     * Use resolving base file name (without extension) otherwise
     * @param {string} fileName Name of current file for checking against (use __filename)
     * @returns {string} Plug-in name
     */
    private static getNameByReference(reference: string): string {
        // Installed plugin dependency (use package name as given)
        if(!/^((\.)?\.)?\//.test(reference)) {
            return reference.toLowerCase();
        }

        // Locally deployed plugin, path given (construct absolute local path file name)
        if(/^[^/]/.test(reference)) {
            reference = join(dirname(require.main.filename), reference);
        }
        
        const packagePath = join(dirname(reference), "package.json");
        const name = existsSync(packagePath) ? require(packagePath).name : null;
        if(name) {
            // Local plugin with named package (use package name)
            return name.toLowerCase();
        }

        // Local plugin without (named) package (use file name (without extension))
        return truncateModuleExtension(reference.match(/([^/]+\/)?[^/]+$/)[0]);
    }

    /**
     * Get a plugin name by respective module motivated call.
     * @param {string} fileName Name of current file for checking against (use __filename)
     * @returns {string} Plug-in name
     */
    public static getNameByCall(fileName: string): string {
        const path = truncateModuleExtension(Plugin.getCallerPath(fileName));

        // Iterate plugin registry for matching plugin and caller path to retrieve related name
        try {
            Plugin.registry.forEach((_, name: string) => {
                if(Plugin.registry.get(name).path === path) {
                    throw name;
                }
            });
        } catch(thrown: unknown) {
            // Use thrown string as for callback loop break
            if(typeof thrown === "string") {
                return String(thrown);
            }

            // Pass possible actual error
            throw thrown;
        }

        return undefined;
    }

    /**
     * Integrate plugin reference script tag(s) into a given markup sequence's head element.
     * @param {string} markup Markup sequence
     * @param isCompound Whether the related page is a compound page (to check against respective deployment rule)
     * @returns {string} Markup with reference integration
     */
    public static integratePluginReferences(markup: string, isCompound: boolean): string {
        // TODO: No bundling (or even unbundle) in DEV MODE for better debugging results
        
        const effectivePlugins: string[]  = Array.from(Plugin.registry.keys())
        // Filter for environmentally frontend / client bound plugins
            .filter((name: string) => {
                const pluginObj = Plugin.registry.get(name);

                return (!pluginObj.specific)
                && pluginObj.clientScript
                && (isCompound || !pluginObj.compoundOnly);
            })
            .filter((name: string) => {
                // Filter for not yet (hard)coded plugins
                // Hard coding use case: user defined ordering
                return !
                (new RegExp(`<\\s*script\\s((?!>)(\s|.))*src=("|')\\s*/\\s*${config.pluginRequestPrefix}${name}\\s*\\1((?!>)(\s|.))*>`, "i"))
                    .test(markup);
            });
        // TODO: Pre-filter and store in respective maps?
        
        // No plugin to be referenced (ignore supporting core module either if no individual plugin is effective)
        if(effectivePlugins.length <= 1) {
            return markup;
        }

        // Inject plugin referencing script tag
        const href = `/${config.pluginRequestPrefix}${effectivePlugins.join(config.pluginNameSeparator)}`;

        markup = injectIntoHead(markup, `
            <script src="${href}" charset="utf-8"></script>
        `);
        
        return markup;
    }
    
    /**
     * Check whether a given request URL pathname relates to plugin client module(s) retrieval.
     * @param {string} pathname Request URL pathname
     * @returns {boolean} Whether pathname relates to client module(s)
     */
    public static isClientModuleRequest(pathname: string): boolean {
        if(!
        (new RegExp(`${urlPrefixRegex.source}${config.pluginNameRegex.source}(\\${config.pluginNameSeparator}${config.pluginNameRegex.source})*$`, "i"))
            .test(pathname)) {
            return false;
        }

        return true;
    }

    /**
     * Retrieve client module(s) as requested by given URL pathname.
     * Client module scripts of referenced plugins being concatenated for response. 
     * @param {string} pathname Request URL pathname
     * @returns {string} Concatenated client module scripts
     */
    public static retrieveClientModules(pathname: string): Buffer {
        // Split name load by configured separator and retrieve name respective client scripts if exist
        // Return concatenated client scripts
        return Buffer.from(pathname
            .replace(urlPrefixRegex, "")
            .split(new RegExp(`\\${config.pluginNameSeparator}`, "g"))
            .filter(pluginName => {
                return (config.pluginNameRegex.test(pluginName)
                && Plugin.registry.has(pluginName)
                && Plugin.registry.get(pluginName).clientScript);
            }).map(pluginName => {
                return Plugin.registry.get(pluginName).clientScript;
            })
            .join("\n")
        , "utf-8");
    }
    
    /**
     * Initialize the client module of a plugin.
     * @param {string} relativePath Relative path to client module script file
     * @param {Boolean} [compoundOnly=false] Whether to integrate the client module into compound page environments only
     * @param {Object} [sharedConfig] Shared, plugin local config object providing literals
     */
    public static initClientModule(relativePath: string, sharedConfig?: unknown, compoundOnly?: boolean) {
        const pluginName: string = Plugin.getNameByCall(__filename);	// TODO: Wont work with main file implicit local referencing (file path comparison); Fix!
    
        // TODO: Swap shared and compound argument as of usage frequency (keep backwards compatibility with type check augmented overload)
    
        if(/^\//.test(relativePath)) {
            throw new SyntaxError(`Expecting relative path to plugin client module upon initialization, given absolute path '${relativePath}' for '${pluginName}'`);
        }
    
        // Construct path to plugin client script file
        const pluginDirPath: string = dirname(Plugin.getCallerPath(__filename));
        let clientFilePath: string = join(pluginDirPath, relativePath);
        clientFilePath = (extname(clientFilePath).length == 0)
            ? `${clientFilePath}.js`
            : clientFilePath;
    
        // Read client module file
        if(!existsSync(clientFilePath)) {
            throw new ReferenceError(`Client module file for plugin '${pluginName}' not found at given path '${clientFilePath}'`);
        }
    
        const bareClientScript = String(readFileSync(clientFilePath));
    
        // Construct individual script module
        const modularClientScript: string[] = [`
            ${config.clientModuleAppName} = {
                ... ${config.clientModuleAppName},
                ... {
                    "${pluginName}": (_ => {
                        const console = {
                            log: message => {
                                const atomic = ["string", "number", "boolean"].includes(typeof(message));
                                window.console.log(\`%c[rJS]%c[${pluginName}] %c\${atomic ? message : "\u2193"}\`, "color: gold;", "color: DarkTurquoise;", "color: auto;");
                                !atomic && window.console.log(message);
                            },
                            error: err => {
                                window.console.log(\`%c[rJS]%c[${pluginName}] %c\${err.message}\`, "color: gold;", "color: DarkTurquoise;", "color: red;");
                                window.console.error(err);
                            }
                        };
    
                        const endpoint = {
                            use: (body, progressHandler) => {
                                return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${pluginName}", body, progressHandler);
                            },
                            useNamed: (name, body, progressHandler) => {
                                return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${pluginName}", body, progressHandler, name);
                            }
                        };
                        
                        const ${config.thisRetainerIdentifier} = {
                            endpoint: endpoint.use,
                            useEndpoint: endpoint.use,
                            namedEndpoint: endpoint.useNamed,
                            useNamedEndpoint: endpoint.useNamed,
    
                            ${config.clientModuleReferenceName.public}: {},
                            ${config.clientModuleReferenceName.shared}: ${JSON.stringify(sharedConfig)}
                        };
    
                        for(const member in ${config.thisRetainerIdentifier}) {
                            this[member] = ${config.thisRetainerIdentifier}[member]
                        }
    
                        delete endpoint;
                        
                        `,`
                        
                        return ${config.thisRetainerIdentifier}.${config.clientModuleReferenceName.public};
                    })()
                }
            }
        `]
            .map(part => {
                // Minifiy wrapper
                return part
                    .replace(/([{};,])\s+/g, "$1")
                    .trim();
            });
    
        // Register client module in order to be integrated into pages upon request// Write module and compound directive to registry
        const registryEntry = Plugin.registry.get(pluginName);
    
        registryEntry.clientScript = Buffer.from(`${modularClientScript[0]}${bareClientScript}${(bareClientScript.slice(-1) != ";") ? ";" : ""}${modularClientScript[1]}`, "utf-8");
        registryEntry.compoundOnly = compoundOnly;
    }

    /**
     * Bind (or "connect") a plugin to the environment.
     * @param {string} reference Plug-in reference (dependency name or path to main file)
     * @param {Object} options Plug-in options object
     */
    constructor(reference: string, options: {
        alias?: string;
        specific?: boolean;
    } = {}) {
        if(options.alias && !pluginNameRegex.test(options.alias.trim())) { 
            throw new SyntaxError(`Invalid plugin alias given '', '${reference}'`);
        }

        const name: string = options.alias
        ? options.alias.trim()
        : Plugin.getNameByReference(reference);
        
        // Check for core module (and plugin) naming collision
        if(name === config.coreModuleIdentifier) {
            throw new SyntaxError(`Plug-in referenced by '${reference}' resolves to reserved name 'core'`);
        }

        // Check if plugin with the same internal name has already been registered
        if(Plugin.registry.has(name)) {
            throw new ReferenceError(`More than one Plug-in reference resolving to name '${name}'`);
        }

        const pluginPath: string = Module._resolveFilename(reference, require.main);

        // Register plugin directory for change detection in order to perform a respective reload
        // Only locally deployed plugin as package referenced plugins are most likely third-party maintained
        !pluginNameRegex.test(reference)
        && registerDetection(dirname(pluginPath), () => {
            this.bindPlugin(name, pluginPath);
        });

        // Write plugin data object to registry map
        Plugin.registry.set(name, {
            path: truncateModuleExtension(pluginPath),
            specific: options.specific
        });
        
        this.bindPlugin(name, pluginPath);
    }

    /**
     * Bind (or "connect") a plugin to the environment (internal call, idempotent).
     * @param {string} name Plugin name
     * @param {string} path Path to plugin
     */
    private bindPlugin(name: string, path: string) {
        // Empty module cache (for re-evaluation, only triggered in DEV MODE)
        if(require.cache[path]) {
            delete require.cache[path];
        }
        
        // Read related plugin config sub section/object
        const pluginConfigObj = (pluginConfig[name] as Record<string, unknown>) || undefined;

        // Require custom wrapped module (providing the plugin interface to the module context)
        let pluginModule;
        try {
            // Temporarily manipulate wrapper in order to inject this assignment (representing the plugin interface)
            const _wrap = Module.wrap;

            Module.wrap = ((exports, _, __, __filename, __dirname) => {
                return `${Module.wrapper[0]}
                    const console = {
                        log: message => {
                            require("${require.resolve("../../utilities/output")}").log(message, "${name}")
                        },
                        error: err => {
                            require("${require.resolve("../../utilities/output")}").error(err, false, "${name}");
                        }
                    };
                    
                    for(const inter in require("${require.resolve("../scope:plugin")}")) {
                        this[inter] = require("${require.resolve("../scope:plugin")}")[inter];
                    }

                    this.${config.pluginConfigIdentifier} = ${JSON.stringify(pluginConfigObj)};
                    
                    const ${config.thisRetainerIdentifier} = this;
                ${exports}${Module.wrapper[1]}`;
            });

            pluginModule = require.main.require(path);	// Require using the modified module wrapper

            Module.wrap = _wrap;
        } catch(err) {
            err.message += `\n- ${path}`;

            throw err;
        }

        if(!(pluginModule instanceof Function)) {
            // Static plugin module (not receiving the common interface object)
            return;
        }
        // Dynamic plugin module getting passed the common interface object
        pluginModule(require("../scope:render"));
        
        output.log(`↴ ${name}`);	// TODO: Formatted output
    }
}

export function bindPlugin(reference, options) {
    return new Plugin(reference, options);
}


// Inintially register core client support module
Plugin.registry.set("core", {
	path: null,
	specific: false,
	clientScript: readFileSync(join(__dirname, "../../client/core.js")),
});