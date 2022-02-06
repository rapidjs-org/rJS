/**
 * Individual application scope interface object.
 */


import { wrapInterface } from "./wrapper";


export default {
	plugin: wrapInterface(require("./plugin/registry").bind, "connecting a plug-in", true),
	bindSSR: wrapInterface(require("./bindings").bindSSR, "binding an SSR handler", true),
	bindLocale: wrapInterface(require("./bindings").bindLocale, "binding the locale handler", true)
};