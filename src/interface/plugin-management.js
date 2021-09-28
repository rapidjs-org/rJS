const config = {
	configFilePluginScopeName: "plug-in",
	coreModuleIdentifier: "core",
	frontendModuleAppName: "rapidJS",
	frontendModuleReferenceName: {
		config: "config",
		private: "rJS__PRIVATE",
		public: "PUBLIC"
	},
	pluginNameRegex: /(@[a-z0-9_-]+\/)?[a-z0-9_-]+/i,
	pluginNameSeparator: "+",
	pluginRequestPrefix: "plug-in::"
};


const {join, dirname, basename, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const webConfig = require("../support/web-config").webConfig;

const utils = require("../utils");

const Environment = require("./Environment");


const registry = {
	data: new Map(),
	envs: {}
};


const FULL_PLUGIN_NAME_REGEX = new RegExp(`^${config.pluginNameRegex.source}$`, "i");
const URL_PREFIX_REGEX = new RegExp(`^\\/${config.pluginRequestPrefix}`, "i");


// Register core frontend module
registry.data.set(config.coreModuleIdentifier, {
	frontend: `
		var ${config.frontendModuleAppName} = {};
		${config.frontendModuleAppName}.${config.coreModuleIdentifier} = (_ => {
			${readFileSync(join(__dirname, "../frontend.js"))}
		})();
	`
});
registry.envs[Environment.ANY] = [config.coreModuleIdentifier];


/**
 * Get a value from the config object stored in the plug-in related sib object.
 * @param {String} key Key name
 * @returns {*} Respective value if defined
 */
function readConfig(key) {
	const pluginSubKey = getNameByPath(utils.getCallerPath(__filename));

	const subObj = (webConfig[config.configFilePluginScopeName] || {})[pluginSubKey];
	
	return subObj ? subObj[key] : undefined;
}


function getNameByPath(path) {
	path = path.replace(/\.js/, "");

	try {
		registry.data.forEach((data, name) => {
			if(!data.path) {
				return;
			}

			let parts = data.path.split(path);
			if(parts.length == 2 && parts[0] == "") {
				throw name;
			}
		});
	} catch(name) {
		if(utils.isString(name)) {
			return name;
		}
	}

	return undefined;
}

function getNameByReference(reference) {
	// Installed plug-in by package (use package name as given)
	if(!/^((\.)?\.)?\//.test(reference)) {
		return reference.toLowerCase();
	}

	// Locally deployed plug-in by path (use file name)
	if(/^(\.)?\.\//.test(reference)) {
		reference = join(dirname(require.main.filename), reference);
	}
	
	const packagePath = join(dirname(reference), "package.json");
	const name = existsSync(packagePath) ? require(packagePath).name : null;
	if(name) {
		// Local plug-in with named package (retrieve package name)
		return name.toLowerCase();
	}

	// Local plug-in without (named) package (use file name (without extension))
	return basename(reference).replace(/\.[a-z]+$/, "");
}


/**
 * Connect a plug-in to the core environment.
 * @param {String} reference Reference to the plug-in
 * @param {Object} [options] Options to be set; to the extent of the following supported attributes:
 * - environment: Page environment to integrate the frontend module into (Environment.ANY (default) or EnvironmentSPECIFIC)
 * - alias: Internal name to use (instead of having it be derived automatically (default))
 */
function plugin(reference, options = {}) {
	// TODO: Page environment: what about compound focused plug-ins bound to default page envs?
	if(options.alias && !FULL_PLUGIN_NAME_REGEX.test(options.alias.trim())) {
		throw new SyntaxError(`Plug-in alias invalid; referenced by '${reference}'`);
	}

	const name = options.alias ? options.alias.trim() : getNameByReference(reference);
	
	if(name == config.coreModuleIdentifier) {
		throw new SyntaxError(`Plug-in must not use reserved name '${config.coreModuleIdentifier}'; referenced by '${reference}'`);
	}

	if(registry.data.has(name)) {
		throw new ReferenceError(`Plug-in references '${registry.data.get(name).reference}' and '${reference}' illegally resolve to the equal name '${name}'`);
	}
	
	const pluginPath = FULL_PLUGIN_NAME_REGEX.test(reference)
		? module.constructor._resolveFilename(reference, module.parent)
		: join(dirname(require.main.filename), reference);
		
	registry.data.set(name, {
		reference: reference,
		path: pluginPath,
		frontend: null
	});
	
	const pageEnvironment = options.environment ? options.environment : Environment.ANY;
	!registry.envs[pageEnvironment] && (registry.envs[pageEnvironment] = []);
	registry.envs[pageEnvironment].push(name);

	let pluginModule;
	try {
		pluginModule = module.parent.require(pluginPath);
	} catch(err) {
		err.message += `\n>> This error occured inside of the plug-in module; referenced by '${reference}'`;
		throw err;
	}
	
	if(!utils.isFunction(pluginModule)) {
		throw new SyntaxError(`Plug-in main module does not export interface function; referenced by '${reference}'`);
	}
	pluginModule(pluginInterface);	// Passing plug-in specific core interface object to each plug-in
}

/**
 * Initialize the frontend module of a plug-in.
 * @param {String} path Path to frontend module script file
 * @param {Object} [pluginConfig] Plug-in local config object providing static naming information
 * @param {Boolean} [compoundOnly=false] Whether to integrate the frontend module into compound page environments only
 */
function initFrontendModule(path, pluginConfig, compoundOnly) {
	const pluginDirPath = dirname(utils.getCallerPath(__filename));
	const frontendFilePath = join(pluginDirPath, path);
	const pluginName = getNameByPath(pluginDirPath);

	registerFrontendModule(frontendFilePath, pluginName, pluginConfig, compoundOnly);
}

function registerFrontendModule(frontendFilePath, pluginName, pluginConfig, compoundOnly = false) {
	// Read frontend module file
	(extname(frontendFilePath).length == 0) && (frontendFilePath = `${frontendFilePath}.js`);
	
	if(!existsSync(frontendFilePath)) {
		throw new ReferenceError(`Frontend module file for plug-in '${pluginName}' could not be located at given path '${frontendFilePath}'`);
	}

	let frontendModuleData = String(readFileSync(frontendFilePath));
	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	pluginConfig && (frontendModuleData = frontendModuleData
		.replace(new RegExp(`[^a-zA-Z0-9_.]${config.frontendModuleReferenceName.config}\\s*(\\.\\s*[a-zA-Z0-9_]+)+`, "g"), configAttr => {
			const attrs = configAttr.match(/\.\s*[a-zA-Z0-9_]+/g)
				.map(attr => {
					return attr.slice(1).trim();
				});

			let value = pluginConfig;
			attrs.forEach(attr => {
				value = value[attr];
				
				if(value === undefined) {
					throw new ReferenceError(`Implemented property '${attr}' not defined on given config object at '${frontendFilePath}'`);
				}
			});

			value = utils.isString(value || "") ? `"${value}"` : value;	// Wrap strings in doublequotes

			return `${configAttr.charAt(0)}${value}`;
		}));
	
	// TODO: Wrap with keeping line numbers
	// Wrap in module construct in order to work extensibly in frontend and reduce script complexity
	frontendModuleData = `
		${config.frontendModuleAppName} = {
			... ${config.frontendModuleAppName},
			... {
				"${pluginName}": (${config.frontendModuleReferenceName.private} => {
					const ${config.frontendModuleAppName} = {
						useEndpoint: (body, progressHandler) => {
							return ${config.frontendModuleReferenceName.private}.endpoint("${pluginName}", body, progressHandler);
						}
					};
					const ${config.frontendModuleReferenceName.public} = {};
					${frontendModuleData}${(frontendModuleData.slice(-1) != ";") ? ";" : ""}
					return ${config.frontendModuleReferenceName.public};
				})(${config.frontendModuleAppName}.${config.coreModuleIdentifier})
			}
		};
	`;
	
	// Register frontend module in order to be integrated into pages upon request
	registry.data.get(pluginName).frontend = frontendModuleData;
	registry.data.get(pluginName).compoundOnly = compoundOnly;
}
// TODO: Implement option for plug-in to wait in frontend for another plug-ins intial run completion

function isFrontendRequest(pathname) {
	const adjustedPluginNameRegex = config.pluginNameRegex.source;
	if(!
	(new RegExp(`${URL_PREFIX_REGEX.source}${adjustedPluginNameRegex}(\\${config.pluginNameSeparator}${adjustedPluginNameRegex})*`, "i"))
		.test(pathname)) {
		return false;
	}

	return true;
}

function retrieveFrontendModule(pathname) {
	const names = pathname.replace(URL_PREFIX_REGEX, "");

	return names.split(new RegExp(`\\${config.pluginNameSeparator}`, "g"))
		.filter(name => {
			return (config.pluginNameRegex.test(name) && registry.data.has(name));
		}).map(name => {
			return registry.data.get(name).frontend;
		})
		.join("\n");
}


function integratePluginReference(data, isCompound) {
	const srcLoad = (registry.envs[Environment.ANY] || [])
		.filter(env => {
			return (isCompound || !registry.data.get(env).compoundOnly)
				&& registry.data.get(env).frontend;
		})
		.filter(name => {
			// Ignore if has been hardcoded into head explcitly (use case: user defined ordering)
			return !
			(new RegExp(`<\\s*script\\s+src=("|')\\s*\\/\\s*${config.pluginRequestPrefix}${name}\\s*\\1\\s*>`, "i"))
				.test(data);
		})
		.join(config.pluginNameSeparator);
	
	// Inject plug-in referencing script tag
	data = (srcLoad.length > 0)
		? utils.injectIntoHead(data, `<script src="/${config.pluginRequestPrefix}${srcLoad}"></script>`)
		: data;
	
	return data;
}


module.exports = {
	plugin,
	isFrontendRequest,
	retrieveFrontendModule,
	getNameByPath,

	integratePluginReference,

	initFrontendModule,
	readConfig
};


// Plug-in specific core interface; accessible from referenced plug-in scopes
let pluginInterface = require("../interface:plugin");