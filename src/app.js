// Syntax literals config object
const config = {
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

const server = require("./server");
let core = {
	// General core interface; accessible from the instanciating application's scope
	setRoute: server.setRoute,

	setReader: require("./interface/reader").setReader,
	addRequestInterceptor: require("./interface/request-interceptor").addRequestInterceptor,
	addResponseModifier: require("./interface/response-modifier").addResponseModifier
};
const coreInterface = {
	// Plug-in core interface; accessible from referenced plug-ins' scopes (extending the general core interface)
	...server,
	...core,
	... {
		output,
		initFrontendModule,

		applyReader: require("./interface/reader").applyReader,
		applyResponseModifiers: require("./interface/response-modifier").applyResponseModifiers,
	}
};
// Properties not to keep on the plug-in core interface (but only for the respective application)
delete coreInterface.setReader;

/**
 * Initialize the frontend module of a plug-in.
 * @param {Object} plugInConfig Plug-in local config object providing static naming information
 */
function initFrontendModule(plugInConfig) {
	initFrontendModuleHelper(utils.getCallerPath(__filename), plugInConfig);
}
function initFrontendModuleHelper(plugInDirPath, plugInConfig, pluginName) {
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
	core.addResponseModifier("html", data => {
		if(!frontendModuleData) {
			return;
		}
		
		// Insert referencing script tag into page head (if exists)
		return utils.injectIntoHead(data, `<script src="${frontendFileLocation}"></script>`);
	});
	
	// Add GET route to retrieve frontend module script
	core.setRoute("get", `${frontendFileLocation}`, _ => {
		return frontendModuleData;
	}, true);
}


// Init frontend base file to provide reusable methods among plug-ins
initFrontendModuleHelper(__dirname, null, "core");


/**
 * Create rapid core instance.
 * @param {String[]} plugIns Array of plug-in names to use
 * @returns Minimum core interface object
 */
module.exports = plugIns => {
	(plugIns || []).forEach(reference => {
		try {
			module.parent.require(reference)(coreInterface);
		} catch(err) {
			output.error(err, true);
		}
	});	// TODO: Handle/translate cryptic require errors
	
	return core;
};