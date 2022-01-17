/**
 * Plug-in register functionality.
 */

const config = {
	configFilePluginScopeName: "plug-in",
	coreModuleIdentifier: "core",
	pluginConfigIdentifier: "pluginConfig",
	clientModuleAppName: "rapidJS",
	clientModuleReferenceName: {
		config: "SHARED",
		public: "PUBLIC"
	},
	pluginNameRegex: /(@[a-z0-9+-][*a-z0-9._-]*\/)?[a-z0-9+-][a-z0-9._-]*/,
	pluginNameSeparator: "+",
	pluginRequestPrefix: "plug-in::"
};


const Module = require("module");

import {join, dirname, extname} from "path";
import {existsSync, readFileSync} from "fs";

import pluginConfig from "../../config/config.plugins";

import {registerDetection} from "../../live/detection";

import * as output from "../../utilities/output";
import {injectIntoHead} from "../../utilities/markup";
import {truncateModuleExtension} from "../../utilities/normalize";

import {pluginRegistry} from "../bindings";

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
	specific: false,
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
 * Read a parameter value from the plug-in specific configuration file.
 * Automatically using plug-in scope, i.e. configuration sub object with the reading plug-in's name as key
 * @param {string} path Plug-in name
 * @returns {Record<string, unknown>} Respective sub-object if defined
 */
export function getPluginConfig(name: string): Record<string, unknown> {
	let subObj = pluginConfig[name] as Record<string, unknown>;
	if(subObj) {
		return subObj;
	}

	// Look in server config plug-in section (old paradigm)
	// TODO: Deprecate (mid-term)
	subObj = require("../../config/config.server")["plug-in"] || {};
	
	return subObj[name] as Record<string, unknown> || undefined;
}

/**
 * Load a plug-in module.
 * @param {string} path Path to plug-in module
 * @param {string} path Plug-in name
 */
function loadPlugin(path: string, name: string) {
	if(require.cache[path]) {
		delete require.cache[path];
	}

	let pluginModule;
	try {
		// Temporarily manipulate wrapper in order to inject this assignment (representing the plug-in interface)
		const _wrap = Module.wrap;

		Module.wrap = ((exports, _, __, __filename, __dirname) => {
			return `${Module.wrapper[0]}${exports}
				for(const inter in require("${require.resolve("../scope:plugin")}")) {
					this[inter] = require("${require.resolve("../scope:plugin")}")[inter];
				}
				this.${config.pluginConfigIdentifier} = ${JSON.stringify(getPluginConfig(name))};
				this.${config.clientModuleReferenceName.config} = {};
			${Module.wrapper[1]}`;
		});

		pluginModule = require.main.require(path);	// Require using the modified module wrapper

		Module.wrap = _wrap;
	} catch(err) {
		err.message += `\n- ${path}`;

		throw err;
	}

	if(!(pluginModule instanceof Function)) {
		throw new SyntaxError(`Plug-in '${name}' server module does not provide an interface function`);
	}

	// Evaluate plug-in module
	// Passing the plug-in scoped interface object
	pluginModule(require("../scope:common"));
}


/**
 * Bind (or "connect") a plug-in to the environment (with internal call argument).
 * @param {string} reference Plug-in reference (dependency name or path to main file)
 * @param {Object} options Plug-in options object
 * @param {boolean} [isInternalRelaod] Whether the bind call represents an internal reload (disables duplicate guards)
 */
export function bindPlugin(reference: string, options, isInternalRelaod: boolean = false) {
	// TODO: Page environment: what about compound focused plug-ins bound to default page envs?
	if(options.alias && !pluginNameRegex.test(options.alias.trim())) { 
		throw new SyntaxError(`Invalid plug-in alias given '', '${reference}'`);
	}

	const name: string = options.alias ? options.alias.trim() : getNameByReference(reference);
	
	// Check for core module (and plug-in) naming collision
	if(name === config.coreModuleIdentifier) {
		throw new SyntaxError(`Plug-in referenced by '${reference}' resolved to the reserved name 'core'.`);
	}

	// Check if plug-in with the same internal name has already been registered
	if(!isInternalRelaod && pluginRegistry.has(name)) {
		throw new ReferenceError(`More than one plug-in reference resolve to the name '${name}'`);
	}
	
	const isLocal = !pluginNameRegex.test(reference);
	const pluginPath: string = Module._resolveFilename(reference, require.main);
	
	// Write plug-in data object to registry map
	pluginRegistry.set(name, {
		path: truncateModuleExtension(pluginPath),
		specific: options.specific
	} as IPlugin);
	
	// Load plug-in module
	loadPlugin(pluginPath, name);

	// Register plug-in directory for change detection in order to perform a respective reload
	// Only locally deployed plug-in as package referenced plug-ins are most likely third-party maintained
	isLocal && registerDetection(dirname(pluginPath), () => {
		bindPlugin(reference, options, true);
	});
	
	output.log(`↴ ${name}`);	// TODO: Formatted output
}

/**
 * Bind (or "connect") a plug-in to the environment.
 * @param {string} reference Plug-in reference (dependency name or path to main file)
 * @param {Object} options Plug-in options object
 */
export function bind(reference: string, options: {
	alias?: string;
	specific?: boolean;
} = {}) {
	return bindPlugin(reference, options);
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

			return (!pluginObj.specific)
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
	// TODO: Pre-filter and store in respective maps?
	
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
 * @param {Boolean} [compoundOnly=false] Whether to integrate the client module into compound page environments only
 * @param {Object} [sharedConfig] Shared, plug-in local config object providing literals
 */
export function initClientModule(relativePath: string, sharedConfig?: unknown, compoundOnly?: boolean) {
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

	const bareClientScript = String(readFileSync(clientFilePath));
	
	// Construct individual script module
	// TODO: Deperecated explicit identifers from client core interface (mid-term, "use_")
	// TODO: Minify?
	const modularClientScript: string[] = [`
		${config.clientModuleAppName} = {
			... ${config.clientModuleAppName},
			... {
				"${pluginName}": (_ => {
					const endpoint = {
						use: (body, progressHandler) => {
							return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${pluginName}", body, progressHandler);
						},
						useNamed: (name, body, progressHandler) => {
							return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${pluginName}", body, progressHandler, name);
						}
					};
					
					this.endpoint = endpoint.use;
					this.endpoint = endpoint.use;
					this.useEndpoint = endpoint.use;
					this.namedEndpoint = endpoint.useNamed;
					this.useNamedEndpoint = endpoint.useNamed;

					this.${config.clientModuleReferenceName.public} = {};
					this.${config.clientModuleReferenceName.config} = ${JSON.stringify(sharedConfig)};

					`,`
					
					return this.${config.clientModuleReferenceName.public};
				})(${config.clientModuleAppName})
			}
		}
	`]
	.map(part => {
	// Minifiy wrapper
		return part
			.replace(/([{};,])\s+/g, "$1")
			.trim();
	});

	// Register client module in order to be integrated into pages upon request
	registerClientModule(pluginName, `${modularClientScript[0]}${bareClientScript}${(bareClientScript.slice(-1) != ";") ? ";" : ""}${modularClientScript[1]}`, compoundOnly);
}
// TODO: Implement option for plug-in to wait for another plug-in to have loaded (in client)
// TODO: Implement async/defer option for plug-in (via options object on bind)