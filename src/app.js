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
		external: "plugin",
		internal: "_rapid"
	},
	pluginFrontendModuleName: "frontend"
};

const {join} = require("path");
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

		applyReader: require("./interface/reader").applyReader,
		applyResponseModifiers: require("./interface/response-modifier").applyResponseModifiers,
		
		initFrontendModule,
		getFromConfig,
		createCache: _ => {
			return require("./support/cache");
		}
	}
};


/**
 * Initialize the frontend module of a plug-in.
 * @param {Object} pluginConfig Plug-in local config object providing static naming information
 * @param {Boolean} [compoundPagesOnly=false] Whether to init frontend module only in compound page environments
 */
function initFrontendModule(pluginConfig, compoundPagesOnly = false) {	
	initFrontendModuleHelper(pluginConfig, compoundPagesOnly, utils.getCallerPath(__filename));
}
function initFrontendModuleHelper(pluginConfig, compoundPagesOnly, pluginDirPath, pluginName) {
	pluginName = pluginName ? pluginName : utils.getPluginName(pluginDirPath);

	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	let frontendModuleData;
	let frontendFilePath = join(pluginDirPath, `${config.pluginFrontendModuleName}.js`);
	if(!existsSync(frontendFilePath)) {
		return;
	}

	frontendModuleData = String(readFileSync(frontendFilePath));
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
	`;
	
	const frontendFileLocation = `/${config.frontendModuleFileName.prefix}${pluginName }${config.frontendModuleFileName.suffix}.js`;
	
	// Add response modifier for inserting the script tag into document markup files
	pluginInterface.addResponseModifier(compoundPagesOnly ? ":" : "html", data => {
		if(!frontendModuleData) {
			return;
		}
		
		// Insert referencing script tag into page head (if exists)
		return utils.injectIntoHead(data, `<script src="${frontendFileLocation}"></script>`);
	});
	
	// Add GET route to retrieve frontend module script
	server.registerFrontendModule(frontendFileLocation, frontendModuleData);
}

/**
 * Get a value from the config object stored in the plug-in related sib object.
 * @param {String} key Key name
 * @returns {*} Respective value if defined
 */
function getFromConfig(key) {
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
	initFrontendModuleHelper({
		frontendModuleFileName: config.frontendModuleFileName
	}, false, __dirname, config.coreModuleIdentifier);
	
	(plugins || []).forEach(reference => {
		try {
			if(utils.getPluginName(reference) == config.coreModuleIdentifier) {
				throw new SyntaxError(`Plug-in name must not equal "${config.coreModuleIdentifier}"`);
			}
			
			module.parent.require(reference)(pluginInterface);	// Passing plug-in specific core interface object to each plug-in
		} catch(err) {
			output.error(err, true);
		}
	});	// TODO: Handle/translate cryptic require errors
	
	return appInterface;
};