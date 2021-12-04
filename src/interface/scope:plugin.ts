/**
 * Plug-in scope interface object.
 */


import {wrapInterface} from "./wrapper";


module.exports = {
	...require("./interface:shared"),
	
	initFrontendModule: wrapInterface(require("../plugin/register").initFrontendModule, "initializing a client module", true),
	setEndpoint:  wrapInterface(require("../plugin/endpoint").setDefaultEndpoint, "creating a plug-in endpoint", true),
	setNamedEndpoint:  wrapInterface(require("../plugin/endpoint").setNamedEndpoint, "creating a named plug-in endpoint", true),
	
	readConfig: wrapInterface(require("../interface/plugin").readPluginConfig, "reading the plug-in configuration file")
};