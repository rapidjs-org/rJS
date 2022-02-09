/**
 * Plug-in scope interface object.
 */


import { wrapInterface } from "./wrapper";


const setEndpoint = wrapInterface(require("./plugin/Endpoint").setDefaultEndpoint, "creating a plugin endpoint", true);
const setNamedEndpoint = wrapInterface(require("./plugin/Endpoint").setNamedEndpoint, "creating a named plugin endpoint", true);


// Is referenced via require.resolve(); uses common export model
module.exports = {
	clientModule: wrapInterface(require("./plugin/Plugin").Plugin.initClientModule, "initializing a client module", true),
	
	endpoint: setEndpoint,
	namedEndpoint: setNamedEndpoint,
	// For backwards compatibility (deprecate mid-term)
	setEndpoint: setEndpoint, 
	setNamedEndpoint: setNamedEndpoint
};