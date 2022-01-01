/**
 * Plug-in scope interface object.
 */


import {wrapInterface} from "./wrapper";

const initClientModule: Function = wrapInterface(require("./plugin/registry").initClientModule, "initializing a client module", true);


module.exports = {
	...require("./scope:shared"),
	
	initClientModule: initClientModule,
	initFrontendModule: initClientModule,	// For backwards compatibility (deprecate mid-term)
	setEndpoint:  wrapInterface(require("./plugin/endpoint").setDefaultEndpoint, "creating a plug-in endpoint", true),
	setNamedEndpoint:  wrapInterface(require("./plugin/endpoint").setNamedEndpoint, "creating a named plug-in endpoint", true),
	
	readConfig: wrapInterface(require("./plugin/naming").readPluginConfig, "reading the plug-in configuration file")
};