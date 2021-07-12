/**
 * @copyright Thassilo Martin Schiepanski
 * @author Thassilo Martin Schiepanski
 */

// Syntax literals config object
const config = {
	configFilePluginScopeName: "plug-ins",
	coreModuleIdentifier: "core",
	frontendModuleAppName: "RAPID",
	frontendModuleFileName: {
		prefix: "rapid.",
		suffix: ".frontend"
	},
	frontendModuleReferenceName: {
		external: "PUBLIC",
		internal: "_rapid"
	}
};

const {join, dirname, extname} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("./utils");
const output = require("./interface/output");

const isDevMode = require("./support/is-dev-mode");

const webConfig = require("./support/config").webConfig;


const server = require("./server");


// Core interface

const generalInterface = {
	// General core interface; accessible from both the instanciating application's as well as from referenced plug-in scopes
	isDevMode,
};
const appInterface = {
	// Application specific core interface; accessible from the instanciating application's scope
	...generalInterface,
	... {
		setReader: require("./interface/reader").setReader,
		setRequestInterceptor: require("./interface/request-interceptor").setRequestInterceptor
	}
};
const pluginInterface = {
	// Plug-in specific core interface; accessible from referenced plug-in scopes
	...generalInterface,
	... {
		output,
		webPath: require("./support/web-path"),

		setEndpoint: require("./interface/endpoint").setEndpoint,
		
		addResponseModifier: require("./interface/response-modifier").addResponseModifier,

		useReader: require("./interface/reader").useReader,

		initFrontendModule,
		readConfig,
		createCache: _ => {
			return require("./support/cache");
		}
	}
};

// TODO: Implement custom name argument (for using a set up name instead of deriving it automatically)
/**
 * Initialize the frontend module of a plug-in.
 * @param {String} path Path to frontend module script file
 * @param {Object} pluginConfig Plug-in local config object providing static naming information
 * @param {Boolean} [compoundPagesOnly=false] Whether to init frontend module only in compound page environments
 */
function initFrontendModule(path, pluginConfig, compoundPagesOnly = false) {	
	initFrontendModuleHelper(path, pluginConfig, compoundPagesOnly, utils.getCallerPath(__filename));
}
function initFrontendModuleHelper(path, pluginConfig, compoundPagesOnly, pluginPath, pluginName) {
	if(!pluginName) {
		pluginName = utils.getPluginName(pluginPath);
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
				output.log(`${attrs} not defined in related config object at '${join(pluginDirPath, "frontend.js")}'`);

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
	`;	// TODO: RAPID.scope = ...(no access to entirescope from within)
	
	const frontendFileLocation = `/${config.frontendModuleFileName.prefix}${pluginName}${config.frontendModuleFileName.suffix}.js`;
	
	// Add response modifier for inserting the script tag into document markup files
	pluginInterface.addResponseModifier(compoundPagesOnly ? ":" : "html", data => {
		if(!frontendModuleData) {
			return;
		}
		
		// Insert referencing script tag into page head (if exists)
		return utils.injectIntoHead(data, `<script src="${frontendFileLocation}"></script>`);
	});
	
	// Add GET route to retrieve frontend module script
	server.registerFrontendModule(pluginName, {
		pathname: frontendFileLocation,
		data: frontendModuleData
	});
}

/**
 * Get a value from the config object stored in the plug-in related sib object.
 * @param {String} key Key name
 * @returns {*} Respective value if defined
 */
function readConfig(key) {
	let pluginSubKey = utils.getCallerPath(__filename);
	
	pluginSubKey = utils.getPluginName(pluginSubKey);

	const subObj = (webConfig[config.configFilePluginScopeName] || {})[pluginSubKey];
	
	return subObj ? subObj[key] : undefined;
}


/**
 * Create rapidJS core instance.
 * @param {String[]} plugins Array of plug-in names to use
 * @returns Application specific core interface object
 */
module.exports = plugins => {
	// Init frontend base file to provide reusable methods among plug-ins
	initFrontendModuleHelper("./frontend.js", {
		frontendModuleFileName: config.frontendModuleFileName
	}, false, __dirname, config.coreModuleIdentifier);
	
	const registeredPlugins = new Map();
	(plugins || []).forEach(reference => {
		try {
			const name = utils.getPluginName(reference);

			if(name == config.coreModuleIdentifier) {
				throw new SyntaxError(`Plug-in must not use reserved name '${config.coreModuleIdentifier}'`);
			}
			if(registeredPlugins.has(name)) {
				throw new ReferenceError(`Plug-in references '${registeredPlugins.get(name)}' and '${reference}' illegally resolve to the same internal name '${name}'`);
			}
			
			registeredPlugins.set(name, reference);
			
			module.parent.require(reference)(pluginInterface);	// Passing plug-in specific core interface object to each plug-in
		} catch(err) {
			output.log(`An error occurred connecting the plug-in from  '${reference}':`);
			output.error(err, true);
		}
	});	// TODO: Handle/translate cryptic require errors
	
	return appInterface;
};