const utils = require("../utils");

const output = require("../support/output");

const page = require("./page");


const frontendModules = {
	registered: new Set(),
	data: new Map()
};

const environments = {};	// TODO: Optimize storage model complexity

function addEnvironment(pluginName, pageEnvironment) {
	if(pageEnvironment == page.SPECIFIC) {
		return;
	}
	
	pageEnvironment = String(pageEnvironment);

	!environments[pageEnvironment] && (environments[pageEnvironment] = []);
	environments[pageEnvironment].push(pluginName);
}


function getPathname(pluginName) {
	return `/${utils.pluginRequestPrefix}${pluginName}`;
}


module.exports = {
	registerModule: (pluginName, data, pageEnvironment) => {
		if(frontendModules.registered.has(pluginName)) {
			output.log(`Redundant initialization of frontend module for plug-in '${pluginName}'`);
		}
		
		frontendModules.registered.add(pluginName);
		frontendModules.data.set(getPathname(pluginName), data);

		addEnvironment(pluginName, pageEnvironment);
	},

	integrateEnvironment: (data, type) => {
		(environments[String(type)] || []).forEach(pluginName => {
			data = utils.injectIntoHead(data, `<script src="${getPathname(pluginName)}"></script>`);
		});

		return data;
	},

	has: (pathname) => {
		return frontendModules.data.has(pathname);
	},

	get: (pathname) => {
		return frontendModules.data.get(pathname);
	},
};