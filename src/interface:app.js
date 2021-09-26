const {createInterface} = require("./utils");


module.exports = {
	...require("./interface:shared"),
	
	ClientError: require("./interface/ClientError"),
	Environment: require("./interface/Environment"),

	isDevMode: require("./support/is-dev-mode"),
	
	bindTemplating: createInterface(require("./interface/templater").bind, "binding a templating handler", true),
	plugin: createInterface(require("./interface/plugin-management").plugin, "connecting a plug-in", true)
};