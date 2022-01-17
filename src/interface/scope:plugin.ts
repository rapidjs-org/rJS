/**
 * Plug-in scope interface object.
 */


import {wrapInterface} from "./wrapper";

const endpoint = wrapInterface(require("./plugin/endpoint").setDefaultEndpoint, "creating a plug-in endpoint", true);
const namedEndpoint = wrapInterface(require("./plugin/endpoint").setNamedEndpoint, "creating a named plug-in endpoint", true);

// TODO: Overload
module.exports = {
	clientModule: wrapInterface(require("./plugin/registry").initClientModule, "initializing a client module", true),
	
	endpoint: endpoint,
	namedEndpoint: namedEndpoint,
	// For backwards compatibility (deprecate mid-term)
	setEndpoint: endpoint, 
	setNamedEndpoint: namedEndpoint
};