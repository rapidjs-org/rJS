/**
 * Individual application scope interface object.
 */


import {wrapInterface} from "./wrapper";


module.exports = {
	...require("./scope:shared"),

	...require("./Environment"),
	
	isDevMode: require("../utilities/is-dev-mode"),
	
	plugin: wrapInterface(require("./plugin/registry").bind, "connecting a plug-in", true),
	bindTemplating: wrapInterface(require("./templating").bind, "binding a templating handler", true)
};