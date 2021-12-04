/**
 * Individual application scope interface object.
 */


import {wrapInterface} from "./wrapper";


module.exports = {
	...require("./interface:shared"),

	...require("./Environment"),
	
	isDevMode: require("../utilities/is-dev-mode"),
	
	plugin: wrapInterface(require("./plugin/register").bind, "connecting a plug-in", true),
	bindTemplating: wrapInterface(require("../mods/templating").bind, "binding a templating handler", true)
};