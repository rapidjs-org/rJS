"use strict";
/**
 * Plug-in scope interface object.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wrapper_1 = require("./wrapper");
const clientModule = (0, wrapper_1.wrapInterface)(require("./plugin/registry").initClientModule, "initializing a client module", true);
const endpoint = (0, wrapper_1.wrapInterface)(require("./plugin/endpoint").setDefaultEndpoint, "creating a plug-in endpoint", true);
const namedEndpoint = (0, wrapper_1.wrapInterface)(require("./plugin/endpoint").setNamedEndpoint, "creating a named plug-in endpoint", true);
module.exports = Object.assign(Object.assign({}, require("./scope:shared")), { 
    // New identifiers
    clientModule: clientModule, endpoint: endpoint, namedEndpoint: namedEndpoint, 
    // For backwards compatibility (deprecate mid-term)
    initFrontendModule: clientModule, setEndpoint: endpoint, setNamedEndpoint: namedEndpoint, readConfig: (0, wrapper_1.wrapInterface)(require("./plugin/naming").readPluginConfig, "reading the plug-in configuration file") });
