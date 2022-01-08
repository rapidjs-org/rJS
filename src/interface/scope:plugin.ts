/**
 * Plug-in scope interface object.
 */


import {wrapInterface} from "./wrapper";

const clientModule: Function = wrapInterface(require("./plugin/registry").initClientModule, "initializing a client module", true);
const endpoint: Function = wrapInterface(require("./plugin/endpoint").setDefaultEndpoint, "creating a plug-in endpoint", true);
const namedEndpoint: Function = wrapInterface(require("./plugin/endpoint").setNamedEndpoint, "creating a named plug-in endpoint", true);


module.exports = {
	...require("./scope:shared"),
	
	// New identifiers
	clientModule: clientModule,
	endpoint: endpoint,
	namedEndpoint: namedEndpoint,
	// For backwards compatibility (deprecate mid-term)
	initFrontendModule: clientModule,
	setEndpoint: endpoint, 
	setNamedEndpoint: namedEndpoint, 
	
	readConfig: wrapInterface(require("./plugin/naming").readPluginConfig, "reading the plug-in configuration file")
};