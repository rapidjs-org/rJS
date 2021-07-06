// Syntax literals config object
const config = {
	configFilePluginScopeName: "plug-ins",
	frontendModuleAppName: "RAPID",
	frontendModuleFileName: {
		prefix: "rapid.",
		suffix: ".frontend"
	},
	frontendModuleReferenceName: {
		external: "plugin",
		internal: "_rapid"
	},
	plugInFrontendModuleName: "frontend"
};

const {join} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("./utils");
const output = require("./interface/output");

const isDevMode = require("./support/is-dev-mode");

const webConfig = require("./support/config").webConfig;


const server = require("./server");

const generalInterface = {
	// General core interface; accessible from both the instanciating application's as well as from referenced plug-in scopes
	...server,
	... {
		addRequestInterceptor: require("./interface/request-interceptor").addRequestInterceptor,
		addResponseModifier: require("./interface/response-modifier").addResponseModifier
	}
};
const appInterface = {
	// Application specific core interface; accessible from the instanciating application's scope
	...generalInterface,
	... {
		setReader: require("./interface/reader").setReader
	}
};
const pluginInterface = {
	// Plug-in specific core interface; accessible from referenced plug-in scopes
	...generalInterface,
	... {
		isDevMode,
		output,

		webPath: require("./support/web-path"),

		initFrontendModule,
		getFromConfig,

		applyReader: require("./interface/reader").applyReader,
		applyResponseModifiers: require("./interface/response-modifier").applyResponseModifiers,

		createCache: _ => {
			return require("./support/cache");
		}
	}
};

/**
 * Initialize the frontend module of a plug-in.
 * @param {Object} plugInConfig Plug-in local config object providing static naming information
 * @param {Boolean} [compoundPagesOnly=false] Whether to init frontend module only in compound page environments
 */
function initFrontendModule(plugInConfig, compoundPagesOnly = false) {
	initFrontendModuleHelper(utils.getCallerPath(__filename), plugInConfig, compoundPagesOnly);
}
function initFrontendModuleHelper(plugInDirPath, plugInConfig, compoundPagesOnly, pluginName) {
	pluginName = pluginName ? pluginName : utils.getPluginName(plugInDirPath);

	// Substitute config attribute usages in frontend module to be able to use the same config object between back- and frontend
	let frontendModuleData;
	let frontendFilePath = join(plugInDirPath, `${config.plugInFrontendModuleName}.js`);
	if(!existsSync(frontendFilePath)) {
		return;
	}

	frontendModuleData = String(readFileSync(frontendFilePath));
	plugInConfig && (frontendModuleData.match(/[^a-zA-Z0-9_]config\s*\.\s*[a-zA-Z0-9_]+/g) || []).forEach(configAttr => {
		const attr = configAttr.match(/[a-zA-Z0-9_]+$/)[0];
		let value = plugInConfig[attr];

		(value === undefined) && (output.log(`${attr} not defined in related config object at '${join(plugInDirPath, "frontend.js")}'`));

		(value !== null && isNaN(value)) && (value = `"${value}"`);		// Wrap strings in doublequotes
		
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
	appInterface.addResponseModifier(compoundPagesOnly ? ":" : "html", data => {
		if(!frontendModuleData) {
			return;
		}
		
		// Insert referencing script tag into page head (if exists)
		return utils.injectIntoHead(data, `<script src="${frontendFileLocation}"></script>`);
	});
	
	// Add GET route to retrieve frontend module script
	appInterface.setRoute("get", `${frontendFileLocation}`, _ => {
		return frontendModuleData;
	}, true);
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
 * @param {String[]} plugIns Array of plug-in names to use
 * @returns Application specific core interface object
 */
module.exports = plugIns => {
	// Init frontend base file to provide reusable methods among plug-ins
	initFrontendModuleHelper(__dirname, null, null, "core");
	
	(plugIns || []).forEach(reference => {
		try {
			module.parent.require(reference)(pluginInterface);	// Passing plug-in specific core interface object to each plug-in
		} catch(err) {
			output.error(err, true);
		}
	});	// TODO: Handle/translate cryptic require errors
	
	return appInterface;
};