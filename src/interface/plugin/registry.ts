/**
 * Plug-in register functionality.
 */

const config = {
	configFilePluginScopeName: "plug-in",
	coreModuleIdentifier: "core",
	clientModuleAppName: "rapidJS",
	clientModuleReferenceName: {
		config: "this\\.config",
		private: "rJS__PRIVATE",
		public: "PUBLIC"
	},
	pluginNameRegex: /(@[a-z0-9+-][*a-z0-9._-]*\/)?[a-z0-9+-][a-z0-9._-]*/,
	pluginNameSeparator: "+",
	pluginRequestPrefix: "plug-in::"
};


import {join, dirname, extname} from "path";
import {existsSync, readFileSync} from "fs";

import {pluginRegistry} from "../bindings";

import {registerDetectionDir} from "../../live/detection";

import isDevMode from "../../utilities/is-dev-mode";
import * as output from "../../utilities/output";
import {injectIntoHead} from "../../utilities/markup";
import {truncateModuleExtension} from "../../utilities/normalize";

import {EEnvironment} from "../EEnvironment";

import {getNameByCall, getNameByReference, getPathByCall} from "./naming";


// Automatic client module location detection and integration?

/**
 * Plug-in name regex.
 */
const pluginNameRegex = new RegExp(`^${config.pluginNameRegex.source}$`, "i");
/**
 * Plug-in request URL prefix regex.
 */
const urlPrefixRegex = new RegExp(`^\\/${config.pluginRequestPrefix}`, "i");


// REGISTER CLIENT CORE SUPPORT MODULE
pluginRegistry.set("core", {
	path: null,
	environment: EEnvironment.ANY,
	clientScript: readFileSync(join(__dirname, "../../client/core.js")),
});


/**
 * Register a plug-in's client / frontend module.
 * @param {string} pluginName Plug-in name
 * @param {string} modularClientScript Wrapped / Modularized client script
 * @param {boolean} compoundOnly Whether to only have the plug-in integrated into compound pages
 */
function registerClientModule(pluginName: string, modularClientScript: string, compoundOnly = false) {
	// TODO: Wrap in a way, line numbers keep position (for error output)?
	// TODO: Wrapper minification?

	// Write module and compound directive to registry
	const registryEntry = pluginRegistry.get(pluginName);

	registryEntry.clientScript = Buffer.from(modularClientScript, "utf-8");
	registryEntry.compoundOnly = compoundOnly;
}

/**
 * Load a plug-in module.
 * @param {string} path Path to plug-in module
 */
function loadPlugin(path: string) {
	if(require.cache[path]) {
		// Delete module reference first is already exists (for reloading capabilities)
		delete require.cache[path];
	}
	
	let pluginModule;
	try {
		pluginModule = require.main.require(path);
	} catch(err) {
		err.message += `\n- ${path}`;

		throw err;
	}

	if(!(pluginModule instanceof Function)) {
		throw new SyntaxError(`Plug-in main module referenced by '${path}' does not export interface function`);
	}
	
	// Evaluate plug-in module
	// Passing the plug-in scoped interface object
	pluginModule(pluginInterface);
}


/**
 * Bind (or "connect") a plug-in to the environment.
 * @param {string} reference Plug-in reference (dependency name or path to main file)
 * @param {Object} options Plug-in options object
 */
export function bind(reference: string, options: {
	alias?: string;
	environment?: EEnvironment;
} = {}) {
	// TODO: Page environment: what about compound focused plug-ins bound to default page envs?
	if(options.alias && !pluginNameRegex.test(options.alias.trim())) { 
		throw new SyntaxError(`Invalid plug-in alias given '', '${reference}'`);
	}

	const name: string = options.alias ? options.alias.trim() : getNameByReference(reference);
	
	// Check for core module (and plug-in) naming collision
	if(name === config.coreModuleIdentifier) {
		throw new SyntaxError(`Multiple plug-ins resolve to the same name '${name}'`);
	}

	// Check if plug-in with the same internal name has already been registered
	if(pluginRegistry.has(name)) {
		throw new ReferenceError(`More than one plug-in reference resolves to the name '${name}'`);
	}
	
	const pluginPath: string = pluginNameRegex.test(reference)
		? (module.constructor as IModuleConstructor)._resolveFilename(reference, require.main)
		: join(dirname(require.main.filename), reference);
	
	// Write plug-in data object to registry map
	pluginRegistry.set(name, {
		path: truncateModuleExtension(pluginPath),
		environment: options.environment ? options.environment : EEnvironment.ANY
	} as IPlugin);
	
	// Load pluginModule
	loadPlugin(pluginPath);

	// Register 
	registerDetectionDir(pluginPath);

	isDevMode && output.log(`>> Plug-in: '${name}'`);	// TODO: Formatted output
}


/**
 * Integrate plug-in reference script tag(s) into a given markup sequence's head element.
 * @param {string} markup Markup sequence
 * @param isCompound Whether the related page is a compound page (to check against respective deployment rule)
 * @returns {string} Markup with reference integration
 */
export function integratePluginReferences(markup: string, isCompound: boolean): string {
	const effectivePlugins: string[]  = Array.from(pluginRegistry.keys())
	// Filter for environmentally frontend / client bound plug-ins
		.filter((name: string) => {
			const pluginObj = pluginRegistry.get(name);

			return (pluginObj.environment == EEnvironment.ANY)
			&& pluginObj.clientScript
			&& (isCompound || !pluginObj.compoundOnly);
		})
		.filter((name: string) => {
			// Filter for not yet (hard)coded plug-ins
			// Hard coding use case: user defined ordering
			// TODO: Enhance detection (bundled!)
			return !
			(new RegExp(`<\\s*script\\s+src=("|')\\s*/\\s*${config.pluginRequestPrefix}${name}\\s*\\1\\s*>`, "i"))
				.test(markup);
		});
	
	// No plug-in to be referenced (ignore supporting core module either if no individual plug-in is effective)
	if(effectivePlugins.length <= 1) {
		return markup;
	}

	// Inject plug-in referencing script tag
	const href = `/${config.pluginRequestPrefix}${effectivePlugins.join(config.pluginNameSeparator)}`;

	markup = injectIntoHead(markup, `
		<script src="${href}"></script>
	`);
	
	return markup;
}

/**
 * Check whether a given request URL pathname relates to plug-in client module(s) retrieval.
 * @param {string} pathname Request URL pathname
 * @returns {boolean} Whether pathname relates to client module(s)
 */
export function isClientModuleRequest(pathname: string): boolean {
	if(!
	(new RegExp(`^${urlPrefixRegex.source}${config.pluginNameRegex.source}(\\${config.pluginNameSeparator}${config.pluginNameRegex.source})*`, "i"))
		.test(pathname)) {
		return false;
	}

	return true;
}

/**
 * Retrieve client module(s) as requested by given URL pathname.
 * Client module scripts of referenced plug-ins being concatenated for response. 
 * @param {string} pathname Request URL pathname
 * @returns {string} Concatenated client module scripts
 */
export function retrieveClientModules(pathname: string): Buffer {
	// Split name load by configured separator and retrieve name respective client scripts if exist
	// Return concatenated client scripts
	return Buffer.from(pathname
		.replace(urlPrefixRegex, "")
		.split(new RegExp(`\\${config.pluginNameSeparator}`, "g"))
		.filter(pluginName => {
			return (config.pluginNameRegex.test(pluginName)
			&& pluginRegistry.has(pluginName)
			&& pluginRegistry.get(pluginName).clientScript);
		}).map(pluginName => {
			return pluginRegistry.get(pluginName).clientScript;
		})
		.join("\n")
	, "utf-8");
}


/**
 * Initialize the client module of a plug-in.
 * @param {string} relativePath Relative path to client module script file
 * @param {Object} [pluginConfig] Plug-in local config object providing static naming information
 * @param {Boolean} [compoundOnly=false] Whether to integrate the client module into compound page environments only
 */
export function initClientModule(relativePath: string, pluginConfig?: unknown, compoundOnly?: boolean) {
	const pluginName: string = getNameByCall(__filename);	// TODO: Wont work with main file implicit local referencing (filas path comparison); Fix!

	if(/^\//.test(relativePath)) {
		throw new SyntaxError(`Expecting relative path to plug-in client module upon initialization, given absolute path '${relativePath}' for '${pluginName}'`);
	}

	// Construct path to plug-in client script file
	const pluginDirPath: string = getPathByCall(__filename);
	let clientFilePath: string = join(pluginDirPath, relativePath);
	clientFilePath = (extname(clientFilePath).length == 0)
		? `${clientFilePath}.js`
		: clientFilePath;

	// Read client module file
	
	if(!existsSync(clientFilePath)) {
		throw new ReferenceError(`Client module file for plug-in '${pluginName}' not found at given path '${clientFilePath}'`);
	}

	let bareClientScript = String(readFileSync(clientFilePath));

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
					if(!value) {
						return;
					}

					value = value[attr];
				});

				value = (typeof(value) === "string" || value instanceof String)
					? `"${value}"`
					: value;	// Wrap string values in doublequotes

				return `${configAttr.charAt(0)}${value}`;
			})
		: bareClientScript;
	
	// Construct individual script module
	// TODO: Deperecated explicit identifers from client core interface (mid-term, "use_")
	// TODO: Minify?
	// TODO: this
	const modularClientScript = `
		${config.clientModuleAppName} = {
			... ${config.clientModuleAppName},
			... {
				"${pluginName}": (${config.clientModuleReferenceName.private} => {
					const endpoint = {
						use: (body, progressHandler) => {
							return ${config.clientModuleReferenceName.private}.toEndpoint("${pluginName}", body, progressHandler);
						},
						useNamed: (name, body, progressHandler) => {
							return ${config.clientModuleReferenceName.private}.toEndpoint("${pluginName}", body, progressHandler, name);
						}
					};
					const ${config.clientModuleAppName} = {
						...${config.clientModuleReferenceName.private},
						endpoint: endpoint.use,
						useEndpoint: endpoint.use,
						namedEndpoint: endpoint.useNamed,
						useNamedEndpoint: endpoint.useNamed,
					};
					delete ${config.clientModuleAppName}.toEndpoint;
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
// TODO: Implement option for plug-in to wait for another plug-in to have loaded (in client)
// TODO: Implement async/defer option for plug-in (via options object on bind)


// Plug-in scoped interface
// Accessible from within the scope of each referenced plug-in
const pluginInterface = require("../scope:plugin");