/**
 * Individual application scope interface object.
 */


import {wrapInterface} from "./wrapper";

const bindSSR = wrapInterface(require("./bindings").bindSSR, "binding an SSR handler", true);


export default {
	plugin: wrapInterface(require("./plugin/registry").bind, "connecting a plug-in", true),
	bindSSR: bindSSR,
	bindTemplating: bindSSR,
	bindLocale: wrapInterface(require("./bindings").bindLocale, "binding the locale handler", true)
};