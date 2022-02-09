/**
 * Individual application scope interface object.
 */


import { wrapInterface } from "./wrapper";


export default {
	plugin: wrapInterface(require("./plugin/Plugin").bindPlugin, "connecting a plugin", true),
	bindSSR: wrapInterface(require("./renderer/TemplatingRenderer").bindSSR, "binding an SSR handler", true),
	bindLocale: wrapInterface(require("./renderer/LocaleRenderer").bindLocale, "binding the locale handler", true)
};