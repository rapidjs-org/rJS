const config = {
	configFilePluginScopeName: "plug-in",
	coreModuleIdentifier: "core",
	frontendModuleAppName: "rapidJS",
	frontendModuleReferenceName: {
		config: "config",
		external: "PUBLIC",
		internal: "_rapid"
	},
	pluginRequestPrefix: "plug-in:"
};


const {join, dirname, basename, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const webConfig = require("../support/web-config").webConfig;

const utils = require("../utils");
const createInterface = utils.createInterface;

const Environment = require("./Environment");


const registry = {
	data: new Map(),
	envs: {}
};

const pluginNameRegex = /^(@[a-z0-9_-]+\/)?[a-z0-9_-]+$/i;


// Register core frontend module
// TODO: Improve core frontend module integration
registry.data.set(config.coreModuleIdentifier, {
	frontend: null
});
registry.envs[Environment.ANY] = [config.coreModuleIdentifier];
registerFrontendModule(join(__dirname, "../frontend.js"), {
	pluginRequestPrefix: config.pluginRequestPrefix
}, config.coreModuleIdentifier);


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
 * @param {String} [pageEnvironment] Type of page environment to integrate the frontend module into
 * @param {String} [name] Internal name to use instead of having it be derived automatically
 */
function plugin(reference, pageEnvironment, alias) {
	if(alias && !pluginNameRegex.test(alias.trim())) {
		throw new SyntaxError(`Plug-in alias invalid referenced by '${reference}'`);
	}

	const name = alias ? alias.trim() : getNameByReference(reference);
	
	if(name == config.coreModuleIdentifier) {
		throw new SyntaxError(`Plug-in must not use reserved name '${config.coreModuleIdentifier}' referenced by '${reference}'`);
	}

	if(registry.data.has(name)) {
		throw new ReferenceError(`Plug-in references '${registry.data.get(name).reference}' and '${reference}' illegally resolve to the equal name '${name}'`);
	}
	
	const pluginPath = pluginNameRegex.test(reference)
		? module.constructor._resolveFilename(reference, module.parent)
		: join(dirname(require.main.filename), reference);
	
	if(!pageEnvironment) {
		pageEnvironment = Environment.ANY;
	}

	registry.data.set(name, {
		reference: reference,
		path: pluginPath,
		frontend: null
	});
	!registry.envs[pageEnvironment] && (registry.envs[pageEnvironment] = []);
	registry.envs[pageEnvironment].push(name);

	let pluginModule;
	try {
		pluginModule = module.parent.require(pluginPath);
	} catch(err) {
		err.message += `\n>> This error occured inside of the plug-in module referenced by '${reference}'`;
		throw err;
	}
	
	if(!utils.isFunction(pluginModule)) {
		throw new SyntaxError(`Plug-in main module does not export interface function referenced by '${reference}'`);
	}
	pluginModule(pluginInterface);	// Passing plug-in specific core interface object to each plug-in
}

/**
 * Initialize the frontend module of a plug-in.
 * @param {String} path Path to frontend module script file
 * @param {Object} pluginConfig Plug-in local config object providing static naming information
 */
function initFrontendModule(path, pluginConfig) {
	const pluginDirPath = dirname(utils.getCallerPath(__filename));
	const frontendFilePath = join(pluginDirPath, path);
	const pluginName = getNameByPath(pluginDirPath);

	registerFrontendModule(frontendFilePath, pluginConfig, pluginName);
}

function registerFrontendModule(frontendFilePath, pluginConfig, pluginName) {
	// Read frontend module file
	(extname(frontendFilePath).length == 0) && (frontendFilePath = `${frontendFilePath}.js`);
	
	if(!existsSync(frontendFilePath)) {
		throw new ReferenceError(`Frontend module file for plug-in '${pluginName}' could not be located at given path '${frontendFilePath}'`);
	}

	let frontendModuleData = String(readFileSync(frontendFilePath));
	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	pluginConfig && (frontendModuleData= frontendModuleData
		.replace(new RegExp(`[^a-zA-Z0-9_.]${config.frontendModuleReferenceName.config}\\s*(\\.\\s*[a-zA-Z0-9_]+)+`, "g"), configAttr => {
			const attrs = configAttr.match(/\.\s*[a-zA-Z0-9_]+/g)
				.map(attr => {
					return attr.slice(1).trim();
				});

			let value = pluginConfig;
			attrs.forEach(attr => {
				value = value[attr];
			
				if(value === undefined) {
					throw new ReferenceError(`Implemented property '${attrs}' not defined on given config object at '${frontendFilePath}'`);
				}
			});

			value = utils.isString(value) ? `"${value}"` : value;	// Wrap strings in doublequotes
			return `${configAttr.charAt(0)}${value}`;
		}));

	// Wrap in module construct in order to work extensibly in frontend and reduce script complexity
	frontendModuleData = `
		var ${config.frontendModuleAppName} = (${config.frontendModuleReferenceName.internal} => {
		var ${config.frontendModuleReferenceName.external} = {};
		${frontendModuleData}
		${config.frontendModuleReferenceName.internal}${(pluginName != config.coreModuleIdentifier) ? `["${pluginName }"]` : ""} = ${config.frontendModuleReferenceName.external};
		return ${config.frontendModuleReferenceName.internal};
		})(${config.frontendModuleAppName} || {});
	`;	// TODO: rapidJS.scope = ...(no access to entire scope from within)
	
	// Register frontend module in order to be integrated into pages upon request
	registry.data.get(pluginName).frontend = frontendModuleData;
}

function retrieveFrontendModule(path) {
	const prefixRegex = new RegExp(`^\\/${config.pluginRequestPrefix}`, "i");
	if(!(new RegExp(`${prefixRegex.source}${pluginNameRegex.source.slice(1)}`, "i")).test(path)) {
		return undefined;
	}

	const name = path.replace(prefixRegex, "");
	if(!pluginNameRegex.test(name) || !registry.data.has(name)) {
		return undefined;
	}
	
	return registry.data.get(name).frontend;
}


function buildEnvironment(data, pageEnvironment) {
	(registry.envs[pageEnvironment] || []).reverse().forEach(name => {
		data = utils.injectIntoHead(data, `<script src="/${config.pluginRequestPrefix}${name}"></script>`);
	});

	return data;
}


module.exports = {
	plugin,
	retrieveFrontendModule,
	buildEnvironment,
	getNameByPath
};


// Plug-in specific core interface; accessible from referenced plug-in scopes
let pluginInterface = {
	ClientError: require("./ClientError"),
	
	setEndpoint:  createInterface(require("./endpoint").set, "creating an endpoint", true),
	initFrontendModule: createInterface(initFrontendModule, "initializing a frontend module", true),

	readConfig,
	fileRead: require("./reader").apply,
	createCache: require("./cache")
};