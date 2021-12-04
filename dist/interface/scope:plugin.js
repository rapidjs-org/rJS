"use strict";
/**
 * Plug-in scope interface object.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wrapper_1 = require("./wrapper");
module.exports = Object.assign(Object.assign({}, require("./interface:shared")), { initFrontendModule: (0, wrapper_1.wrapInterface)(require("../plugin/register").initFrontendModule, "initializing a client module", true), setEndpoint: (0, wrapper_1.wrapInterface)(require("../plugin/endpoint").setDefaultEndpoint, "creating a plug-in endpoint", true), setNamedEndpoint: (0, wrapper_1.wrapInterface)(require("../plugin/endpoint").setNamedEndpoint, "creating a named plug-in endpoint", true), readConfig: (0, wrapper_1.wrapInterface)(require("../interface/plugin").readPluginConfig, "reading the plug-in configuration file") });
