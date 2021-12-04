"use strict";
/**
 * Plug-in register functionality.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initFrontendModule = exports.retrieveClientModules = exports.isClientModuleRequest = exports.integratePluginReferences = exports.bind = void 0;
const config = {
    configFilePluginScopeName: "plug-in",
    coreModuleIdentifier: "core",
    clientModuleAppName: "rapidJS",
    clientModuleReferenceName: {
        config: "config",
        private: "rJS__PRIVATE",
        public: "PUBLIC"
    },
    pluginNameRegex: /(@[a-z0-9_-]+\/)?[a-z0-9_-]+/i,
    pluginNameSeparator: "+",
    pluginRequestPrefix: "plug-in::"
};
const path_1 = require("path");
const fs_1 = require("fs");
const Environment_1 = require("../Environment");
const bindings_1 = require("../bindings");
// Plug-in scoped interface
// Accessible from within the scope of each referenced plug-in
const pluginInterface = __importStar(require("../scope:plugin"));
const markup_1 = require("../../utilities/markup");
const naming_1 = require("./naming");
/**
 * Plug-in name regex.
 */
const pluginNameRegex = new RegExp(`^${config.pluginNameRegex.source}$`, "i");
/**
 * Plug-in request URL prefix regex.
 */
const urlPrefixRegex = new RegExp(`^\\/${config.pluginRequestPrefix}`, "i");
// REGISTER CLIENT CORE SUPPORT MODULE
registerClientModule("core", String((0, fs_1.readFileSync)("../../client/core.js")));
/**
 * Register a plug-in's client / frontend module.
 * @param {string} pluginName Plug-in name
 * @param {string} modularClientScript Wrapped / Modularized client script
 * @param {boolean} compoundOnly Whether to only have the plug-in integrated into compound pages
 */
function registerClientModule(pluginName, modularClientScript, compoundOnly = false) {
    // TODO: Wrap in a way, line numbers keep position (for error output)?
    // TODO: Wrapper minification?
    // Write module and compound directive to registry
    const registryEntry = bindings_1.pluginRegistry.get(pluginName);
    registryEntry.clientScript = Buffer.from(modularClientScript, "utf-8");
    registryEntry.compoundOnly = compoundOnly;
}
/**
 * Load a plug-in module.
 * @param {string} path Path to plug-in module
 */
function loadPlugin(path) {
    if (require.cache[path]) {
        // Delete module reference first is already exists (for reloading capabilities)
        delete require.cache[path];
    }
    let pluginModule;
    try {
        pluginModule = require.main.require(path);
    }
    catch (err) {
        err.message += `\n>> This error occured inside of the plug-in module; referenced by '${path}'`;
        throw err;
    }
    if (!(pluginModule instanceof Function)) {
        throw new SyntaxError(`Plug-in main module does not export interface function; referenced by '${path}'`);
    }
    // Evaluate plug-in module
    // Passing the plug-in scoped interface object
    pluginModule(pluginInterface);
}
/**
 * Bind (or "connect") a plug-in to the environment.
 * @param {string} reference Plug-in reference (dependency name or path to main file)
 * @param {IOptions} options Plug-in options object
 */
function bind(reference, options = {}) {
    // TODO: Page environment: what about compound focused plug-ins bound to default page envs?
    if (options.alias && !pluginNameRegex.test(options.alias.trim())) {
        throw new SyntaxError(`Invalid plug-in alias given '', '${reference}'`);
    }
    const name = options.alias ? options.alias.trim() : (0, naming_1.getNameByReference)(reference);
    // Check for core module (and plug-in) naming collision
    if (name === config.coreModuleIdentifier) {
        throw new SyntaxError(`Multiple plug-ins resolve to the same name '${name}'`);
    }
    // Check if plug-in with the same internal name has already been registered
    if (bindings_1.pluginRegistry.has(name)) {
        throw new ReferenceError(`Plug-in references '${bindings_1.pluginRegistry.get(name).reference}' and '${reference}' illegally resolve to the same name: '${name}'`);
    }
    const pluginPath = pluginNameRegex.test(reference)
        ? reference //module.constructor._resolveFilename(reference, require.main)
        : (0, path_1.join)((0, path_1.dirname)(require.main.filename), reference);
    // Write plug-in data object to registry map
    bindings_1.pluginRegistry.set(name, {
        reference: pluginPath,
        environment: options.environment ? options.environment : Environment_1.Environment.ANY
    });
    // Load pluginModule
    loadPlugin(pluginPath);
}
exports.bind = bind;
/**
 * Integrate plug-in reference script tag(s) into a given markup sequence's head element.
 * @param {string} markup Markup sequence
 * @param isCompound Whether the related page is a compound page (to check against respective deployment rule)
 * @returns {string} Markup with reference integration
 */
function integratePluginReferences(markup, isCompound) {
    const effectivePlugins = Array.from(bindings_1.pluginRegistry.keys())
        // Filter for environmentally frontend / client bound plug-ins
        .filter((name) => {
        const pluginObj = bindings_1.pluginRegistry.get(name);
        return pluginObj.clientScript
            && (isCompound || pluginObj.compoundOnly);
    })
        // Filter for not yet (hard)coded plug-ins
        // Hard coding use case: user defined ordering
        .filter((name) => {
        // TODO: Enhance detection
        return !(new RegExp(`<\\s*script\\s+src=("|')\\s*\\/\\s*${config.pluginRequestPrefix}${name}\\s*\\1\\s*>`, "i"))
            .test(markup);
    });
    // No plug-in to be referenced (ignore supporting core module either if no individual plug-in is effective)
    if (effectivePlugins.length <= 1) {
        return markup;
    }
    // Inject plug-in referencing script tag
    const href = `/${config.pluginRequestPrefix}${effectivePlugins.join(config.pluginNameSeparator)}`;
    markup = (0, markup_1.injectIntoHead)(markup, `
		<script src="${href}"></script>
	`);
    return markup;
}
exports.integratePluginReferences = integratePluginReferences;
/**
 * Check whether a given request URL pathname relates to plug-in client module(s) retrieval.
 * @param {string} pathname Request URL pathname
 * @returns {boolean} Whether pathname relates to client module(s)
 */
function isClientModuleRequest(pathname) {
    if (!(new RegExp(`${urlPrefixRegex}${config.pluginNameRegex.source}(\\${config.pluginNameSeparator}${config.pluginNameRegex.source})*`, "i"))
        .test(pathname)) {
        return false;
    }
    return true;
}
exports.isClientModuleRequest = isClientModuleRequest;
/**
 * Retrieve client module(s) as requested by given URL pathname.
 * Client module scripts of referenced plug-ins being concatenated for response.
 * @param {string} pathname Request URL pathname
 * @returns {string} Concatenated client module scripts
 */
function retrieveClientModules(pathname) {
    // Split name load by configured separator and retrieve name respective client scripts if exist
    // Return concatenated client scripts
    return Buffer.from(pathname
        .replace(urlPrefixRegex, "")
        .split(new RegExp(`\\${config.pluginNameSeparator}`, "g"))
        .filter(pluginName => {
        return (config.pluginNameRegex.test(pluginName)
            && bindings_1.pluginRegistry.has(pluginName)
            && bindings_1.pluginRegistry.get(pluginName).clientScript);
    }).map(pluginName => {
        return bindings_1.pluginRegistry.get(pluginName).clientScript;
    })
        .join("\n"), "utf-8");
}
exports.retrieveClientModules = retrieveClientModules;
/**
 * Initialize the client module of a plug-in.
 * @param {string} relativePath Relative path to client module script file
 * @param {Object} [pluginConfig] Plug-in local config object providing static naming information
 * @param {Boolean} [compoundOnly=false] Whether to integrate the client module into compound page environments only
 */
function initFrontendModule(relativePath, pluginConfig, compoundOnly) {
    const pluginName = (0, naming_1.getNameByCall)(__filename);
    if (/^\//.test(relativePath)) {
        throw new SyntaxError(`Expecting relative path to plug-in client module upon initialization, given absolute path '${relativePath}' for '${pluginName}'`);
    }
    // Construct path to plug-in client script file
    const pluginDirPath = (0, naming_1.getPathByCall)(__filename);
    let clientFilePath = (0, path_1.join)(pluginDirPath, relativePath);
    clientFilePath = ((0, path_1.extname)(clientFilePath).length == 0)
        ? `${clientFilePath}.js`
        : clientFilePath;
    // Read client module file
    if (!(0, fs_1.existsSync)(clientFilePath)) {
        throw new ReferenceError(`Client module file for plug-in '${pluginName}' not found at given path '${clientFilePath}'`);
    }
    let bareClientScript = String((0, fs_1.readFileSync)(clientFilePath));
    // Substitute config attribute usages in client module to be able to use the same config object between back- and client
    bareClientScript = pluginConfig
        ? bareClientScript
            .replace(new RegExp(`[^a-zA-Z0-9_.]${config.clientModuleReferenceName.config}\\s*(\\.\\s*[a-zA-Z0-9_]+)+`, "g"), configAttr => {
            const attrs = configAttr.match(/\.\s*[a-zA-Z0-9_]+/g)
                .map(attr => {
                return attr.slice(1).trim();
            });
            let value = pluginConfig;
            attrs.forEach(attr => {
                if (!value) {
                    return;
                }
                value = value[attr];
            });
            value = (value instanceof String) ? `"${value}"` : value; // Wrap string values in doublequotes
            return `${configAttr.charAt(0)}${value}`;
        })
        : bareClientScript;
    // Construct individual script module
    const modularClientScript = `
		${config.clientModuleAppName} = {
			... ${config.clientModuleAppName},
			... {
				"${pluginName}": (${config.clientModuleReferenceName.private} => {
					const ${config.clientModuleAppName} = {
						...${config.clientModuleReferenceName.private},
						useEndpoint: (body, progressHandler) => {
							return ${config.clientModuleReferenceName.private}.endpoint("${pluginName}", body, progressHandler);
						},
						useNamedEndpoint: (name, body, progressHandler) => {
							return ${config.clientModuleReferenceName.private}.endpoint("${pluginName}", body, progressHandler, name);
						}
					};
					delete ${config.clientModuleAppName}.endpoint;
					const ${config.clientModuleReferenceName.public} = {};

					${bareClientScript}${(bareClientScript.slice(-1) != ";") ? ";" : ""}
					
					return ${config.clientModuleReferenceName.public};
				})(${config.clientModuleAppName}.${config.coreModuleIdentifier})
			}
		}
	`;
    // Register client module in order to be integrated into pages upon request
    registerClientModule(pluginName, modularClientScript, compoundOnly);
}
exports.initFrontendModule = initFrontendModule;
// TODO: Implement option for plug-in to wait for another plug-in to have loaded (in client)
// TODO: Implement async/defer option for plug-in (via options object on bind)
