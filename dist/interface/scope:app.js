"use strict";
/**
 * Individual application scope interface object.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wrapper_1 = require("./wrapper");
const bindSSR = (0, wrapper_1.wrapInterface)(require("./templating").bind, "binding a templating handler", true);
module.exports = Object.assign(Object.assign(Object.assign({}, require("./scope:shared")), require("./Environment")), { isDevMode: require("../utilities/is-dev-mode"), plugin: (0, wrapper_1.wrapInterface)(require("./plugin/registry").bind, "connecting a plug-in", true), bindSSR: bindSSR, bindTemplating: bindSSR });
