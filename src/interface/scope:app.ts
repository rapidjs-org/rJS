/**
 * Individual application scope interface object.
 */


import {wrapInterface} from "./wrapper";

const bindSSR = wrapInterface(require("./templating").bind, "binding an SSR handler", true);


module.exports = {
	...require("./scope:common"),

	Environment: require("./EEnvironment"),
	
	plugin: wrapInterface(require("./plugin/registry").bind, "connecting a plug-in", true),
	bindSSR: bindSSR,
	bindTemplating: bindSSR,
	bindLocale: wrapInterface(require("./locale").bind, "binding the locale handler", true)
};