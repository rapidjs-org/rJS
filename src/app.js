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

const {normalize, dirname, basename, join} = require("path");
const {existsSync, readFileSync} = require("fs");

const utils = require("./utils");
const output = require("./interface/output");

const server = require("./server");
const core = {
	setRoute: server.setRoute,

	setReader: require("./interface/reader").setReader,
	applyReader: require("./interface/reader").applyReader,
	addResponseModifier: require("./interface/response-modifier").addResponseModifier,
	applyResponseModifier: require("./interface/response-modifier").applyResponseModifier,
	setRequestInterceptor: require("./interface/request-interceptor").setRequestInterceptor
};	// Minimum core interface
const coreInterface = {
	...server,
	...core,
	... {
		output,
		initFrontendModule
	}
};	// Maximum core interface

/**
 * Require a plug-in module on core level passing the maximum core interface object.
 * @param {String} reference Plug-in reference value (public package name or local path to package main file)
 */
function requirePlugin(reference) {
	const packageNameRegex = /^(@[a-z0-9][a-z0-9.~_-]*\/)?[a-z0-9][a-z0-9.~_-]*$/;

	reference = packageNameRegex.test(reference) ? reference : normalize(reference);
	
	if(!packageNameRegex.test(reference)) {
		// Private (local) package
		if(!existsSync(join(dirname(require.main.filename), reference.replace(/(\.js)?$/i, ".js")))) {
			throw new ReferenceError(`Could not find private plug-in at '${reference}'`);
		}

		reference = join(dirname(require.main.filename), reference);
	} else {
		// Public (npm registry) package
		try {
			require(reference).resolve();
		} catch(err) {
			throw new ReferenceError(`Could not find public plug-in package '${reference}'.`);
		}
	}

	require(reference)(coreInterface);
}

/**
 * Initialize the frontend module of a plug-in.
 * @param {Object} plugInConfig Plug-in local config object providing static naming information
 */
function initFrontendModule(plugInConfig) {
	initFrontendModuleHelper(utils.getCallerPath(__filename), plugInConfig);
}
function initFrontendModuleHelper(plugInDirPath, plugInConfig) {
	const plugInName = utils.getPluginName(basename(dirname(plugInDirPath)));
	
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
		${config.frontendModuleReferenceName.internal}["${plugInName}"] = ${config.frontendModuleReferenceName.external}
		return ${config.frontendModuleReferenceName.internal};
		})(${config.frontendModuleAppName} || {});
	`;

	const frontendFileLocation = `/${config.frontendModuleFileName.prefix}${plugInName}${config.frontendModuleFileName.suffix}.js`;

	// Add response modifier for inserting the script tag into document markup files
	core.addResponseModifier("html", data => {
		if(!frontendModuleData) {
			return;
		}
		
		// Insert referencing script tag intto page head (if exists)
		const openingHeadTag = data.match(/<\s*head((?!>)(\s|.))*>/);
		if(!openingHeadTag) {
			return data;
		}
		return data.replace(openingHeadTag[0], `${openingHeadTag[0]}${`<script src="${frontendFileLocation}"></script>`}`);
	});

	// Add GET route to retrieve frontend module script
	core.setRoute("get", `${frontendFileLocation}`, _ => {
		return frontendModuleData;
	});
}


// Init frontend base file to provide reusable methods among plug-ins
initFrontendModuleHelper(__dirname);


/**
 * Create rapid core instance.
 * @param {String[]} plugIns Array of plug-in names to use
 * @returns Minimum core interface object
 */
module.exports = plugIns => {
	(plugIns || []).forEach(name => {
		try {
			requirePlugin(name);
		} catch(err) {
			output.error(err, true);
		}
	});	// TODO: Handle/translate cryptic require errors
	
	return core;
};