const output = require("../interface/output");


const frontendModules = {
	registered: new Set(),
	data: new Map()
};


module.exports = {
	registerModule: (pluginName, pathname, data) => {
		if(frontendModules.registered.has(pluginName)) {
			output.log(`Redundant initialization of frontend module for plug-in '${pluginName}'`);
		}
		
		frontendModules.registered.add(pluginName);
		frontendModules.data.set(pathname, data);
	},

	has: (pathname) => {
		return frontendModules.data.has(pathname);
	},

	get: (pathname) => {
		return frontendModules.data.get(pathname);
	},
};