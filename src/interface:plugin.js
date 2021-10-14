const {createInterface} = require("./utils");


module.exports = {
	...require("./interface:shared"),
	
	ClientError: require("./interface/ClientError"),
	
	setEndpoint:  createInterface(require("./interface/endpoint").setUnnamed, "creating an endpoint", true),
	setNamedEndpoint:  createInterface(require("./interface/endpoint").setNamed, "creating a named endpoint", true),
	initFrontendModule: createInterface(require("./interface/plugin-management").initFrontendModule, "initializing a frontend module", true),
	
	readConfig: require("./interface/plugin-management").readConfig
};