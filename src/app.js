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
	plugInFrontendModuleName: "frontend",
	plugInNamingPrefix: "rapid-"
};

const {normalize, dirname, basename, join} = require("path");
const {existsSync, readFileSync} = require("fs");

const server = require("./server");
const output = require("./interfaces/output");

const coreInterface = {
	...server,
	... {
		output,

		initFrontendModule,
		
		setReader: require("./interfaces/reader").setReader,
		applyReader: require("./interfaces/reader").applyReader,
		addResponseModifier: require("./interfaces/response-modifier").addResponseModifier,
		applyResponseModifier: require("./interfaces/response-modifier").applyResponseModifier,
		setRequestInterceptor: require("./interfaces/request-interceptor").setRequestInterceptor
	}
};


// Store identifiers of required modules from within plug-ins in order to prevent redundant loading
// processes (and overriding or adding functionality interference).
let requiredModules = new Set();


/**
 * Require a plug-in module on core level.
 * Redundant requifre calls of a specific plug-in module will be ignored.
 * @param {String} reference Plug-in reference value (public package name or local path to package main file)
 */
function requirePlugin(reference) {
	const packageNameRegex = /^(@[a-z0-9][a-z0-9.~_-]*\/)?[a-z0-9][a-z0-9.~_-]*$/;

	reference = packageNameRegex.test(reference) ? reference : normalize(reference);

	if(requiredModules.has(reference)) {
		return;
	}
	requiredModules.add(reference);
	
	// Private (local) package
	if(!packageNameRegex.test(reference)) {
		try {
			// TODO: Join path to file for correct require
			require(reference)(module.exports());
		} catch(err) {
			output.error(new ReferenceError(`Could not find private plug-in package main file at '${reference}'`), true);
		}

		return;
	}
	// Public (npm registry) package
	try {
		require(reference).resolve();
	} catch(err) {
		output.error(new ReferenceError(`Could not find public plug-in package '${reference}'.`), true);

		return;
	}

	require(reference)(module.exports());
}

/**
 * Initialize the frontend module of a plug-in.
 * @param {Object} plugInConfig Plug-in local config object providing static naming information
 */
function initFrontendModule(plugInConfig) {
	const getCallerPath = _ => {
		const err = new Error();
		let callerFile,  curFile;
		
		Error.prepareStackTrace = (_, stack) => {
			return stack;
		};

		curFile = err.stack.shift().getFileName();

		while(err.stack.length) {
			callerFile = err.stack.shift().getFileName();
			
			if(curFile !== callerFile) {
				return dirname(callerFile);
			}
		}
		
		throw new SyntaxError("Failed to retrieve path to plug-in package");
	};
	
	initFrontendModuleHelper(getCallerPath(), plugInConfig);
}
function initFrontendModuleHelper(plugInDirPath, plugInConfig) {
	const plugInName = basename(dirname(plugInDirPath)).toLowerCase().replace(new RegExp(`^${config.plugInNamingPrefix}`), "");
	
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
	coreInterface.addResponseModifier("html", data => {
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
	coreInterface.setRoute("get", `${frontendFileLocation}`, _ => {
		return frontendModuleData;
	});
}


// Init frontend base file to provide reusable methods among plug-ins
initFrontendModuleHelper(__dirname);


/**
 * Create rapid core instance.
 * @param {String[]} plugIns Array of plug-in names to use
 * @returns Core coreInterface object
 */
module.exports = plugIns => {
	(plugIns || []).forEach(name => {
		requirePlugin(name);
	});	// TODO: Handle/translate cryptic require errors
	
	return coreInterface;
};