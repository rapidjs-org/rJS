const {createInterface} = require("./utils");


module.exports = {
	...require("./interface:shared"),
	
	ClientError: require("./interface/ClientError"),
	
	setEndpoint:  createInterface(require("./interface/endpoint").set, "creating an endpoint", true),
	initFrontendModule: createInterface(require("./interface/plugin-management").initFrontendModule, "initializing a frontend module", true),
	
	readConfig: require("./interface/plugin-management").readConfig
};