/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */

// Syntax literals config object
const config = {
	configFilePluginScopeName: "plug-in",
	coreModuleIdentifier: "core",
	frontendModuleAppName: "rapidJS",
	frontendModuleReferenceName: {
		external: "PUBLIC",
		internal: "_rapid"
	}
};

const {join, dirname, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("./utils");
const output = require("./support/output");
const pluginManagement = require("./interface/plugin-management");

const webConfig = require("./support/config").webConfig;
const isDevMode = require("./support/is-dev-mode");
const page = require("./interface/page");

const frontendManagement = require("./interface/frontend-management");


require("./server/instance.js");


// Core interface

const generalInterface = {
	// General core interface; accessible from both the instanciating application's as well as from referenced plug-in scopes
	isDevMode
};
const appInterface = {
	// Application specific core interface; accessible from the instanciating application's scope
	...generalInterface,
	... {
		connect,
		setReader: require("./interface/reader").setReader
	}
};
const pluginInterface = {
	// Plug-in specific core interface; accessible from referenced plug-in scopes
	...generalInterface,
	... {
		ClientError: require("./interface/ClientError"),

		page,
		
		initFrontendModule,
		setEndpoint: require("./interface/endpoint").setEndpoint,

		readConfig,
		useReader: require("./interface/reader").useReader,
		createCache: _ => {
			return require("./support/cache");
		}
	}
};

/**
 * Connect a plug-in to the core environment.
 * @param {String} reference Reference to the plug-in
 * @param {String} [name] Internal name to use instead of having it be derived automatically
 */
function connect(reference, name) {
	if(name && !/(@[a-z0-9_-]+\/)?[a-z0-9_-]+/i.test(name.trim())) {
		throw SyntaxError(`Invalid alias for connecting plug-in with reference '${reference}'`);
	}

	try {
		name = name ? name.trim() : pluginManagement.retrievePluginName(reference);

		if(name == config.coreModuleIdentifier) {
			throw new SyntaxError(`Plug-in must not use reserved name '${config.coreModuleIdentifier}'`);
		}
		if(pluginManagement.has(name)) {
			throw new ReferenceError(`Plug-in references '${pluginManagement.getReference(name)}' and '${reference}' illegally resolve to the same internal name '${name}'`);
		}

		let managementReference;
		if(/^(@[a-z0-9_-]+\/)?[a-z0-9_-]+$/i.test(reference)) {
			managementReference = module.constructor._resolveFilename(reference, module.parent);
		} else {
			managementReference = join(dirname(require.main.filename), reference);
		}
		
		pluginManagement.set(name, managementReference);
		
		if(!utils.isFunction(module.parent.require(reference))) {
			throw new SyntaxError(`Plug-in module does not export a function given reference '${reference}'`);
		}

		module.parent.require(reference)(pluginInterface);	// Passing plug-in specific core interface object to each plug-in
	} catch(err) {
		output.log(`An error occurred connecting the plug-in from '${reference}':`);
		output.error(err, true);
	}
}

// TODO: Integrate ClientError interface comprehensively
// TODO: Clean up reader
// TODO: Implement finalizer?
// TODO: Implement URL rewrite feature?
// TODO: Clean/code up templating module and usage
// TODO: General clean up

/**
 * Initialize the frontend module of a plug-in.
 * @param {String} path Path to frontend module script file
 * @param {Object} pluginConfig Plug-in local config object providing static naming information
 * @param {page} [pageEnvironment=page.ANY] In which type of page environment to integrate the frontend module (see page nevironment enumeration)
 */
function initFrontendModule(path, pluginConfig, pageEnvironment = page.ANY) {
	initFrontendModuleHelper(path, pluginConfig, pageEnvironment, utils.getCallerPath(__filename));
}
function initFrontendModuleHelper(path, pluginConfig, pageEnvironment, pluginPath, pluginName) {
	if(!pluginName) {
		pluginName = pluginManagement.getName(pluginPath);

		pluginPath = dirname(pluginPath);
	}
	
	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	let frontendFilePath = join(pluginPath, path);
	(extname(frontendFilePath).length == 0) && (frontendFilePath = `${frontendFilePath}.js`);
	if(!existsSync(frontendFilePath)) {
		output.error(new ReferenceError(`Frontend file for plug-in '${pluginName}' could not be located at '${frontendFilePath}'`));

		return;
	}

	let frontendModuleData = String(readFileSync(frontendFilePath));
	pluginConfig && (frontendModuleData.match(/[^a-zA-Z0-9_.]config\s*(\.\s*[a-zA-Z0-9_]+)+/g) || []).forEach(configAttr => {
		const attrs = configAttr.match(/\.\s*[a-zA-Z0-9_]+/g)
			.map(attr => {
				return attr.slice(1).trim();
			});

		let value = pluginConfig;
		attrs.forEach(attr => {
			value = value[attr];
			
			if(value === undefined) {
				output.error(new ReferenceError(`${attrs} not defined in given config object at '${frontendFilePath}'`), true);

				return;
			}
		});

		(value && isNaN(value)) && (value = `"${value}"`);		// Wrap strings in doublequotes
		frontendModuleData = frontendModuleData.replace(configAttr, `${configAttr.slice(0, 1)}${value}`);
	});

	// Wrap in module construct in order to work extensibly in frontend and reduce script complexity
	frontendModuleData = `
		"use strict";
		var ${config.frontendModuleAppName} = (${config.frontendModuleReferenceName.internal} => {
		var ${config.frontendModuleReferenceName.external} = {};
		${frontendModuleData}
		${config.frontendModuleReferenceName.internal}["${pluginName }"] = ${config.frontendModuleReferenceName.external};
		return ${config.frontendModuleReferenceName.internal};
		})(${config.frontendModuleAppName} || {});
	`;	// TODO: rapidJS.scope = ...(no access to entire scope from within)
	
	// Add GET route to retrieve frontend module script
	frontendManagement.registerModule(pluginName, frontendModuleData, pageEnvironment);
}	// TODO: Auto-init (via connect)!!!

/**
 * Get a value from the config object stored in the plug-in related sib object.
 * @param {String} key Key name
 * @returns {*} Respective value if defined
 */
function readConfig(key) {
	const pluginSubKey = pluginManagement.getName(utils.getCallerPath(__filename));

	const subObj = (webConfig[config.configFilePluginScopeName] || {})[pluginSubKey];
	
	return subObj ? subObj[key] : undefined;
}


// Init frontend base file to provide reusable methods among plug-ins
initFrontendModuleHelper("./frontend.js", {
	pluginRequestPrefix: utils.pluginRequestPrefix
}, page.ANY, __dirname, config.coreModuleIdentifier);
// TODO: Provide isDevMode property on core frontend module


module.exports = appInterface;

// TODO: Implement templating feature on core (including to "includes" functionality)