/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const wrapper_1=require("./wrapper");module.exports=Object.assign(Object.assign({},require("./interface:shared")),{initFrontendModule:(0,wrapper_1.wrapInterface)(require("../plugin/register").initFrontendModule,"initializing a client module",!0),setEndpoint:(0,wrapper_1.wrapInterface)(require("../plugin/endpoint").setDefaultEndpoint,"creating a plug-in endpoint",!0),setNamedEndpoint:(0,wrapper_1.wrapInterface)(require("../plugin/endpoint").setNamedEndpoint,"creating a named plug-in endpoint",!0),readConfig:(0,wrapper_1.wrapInterface)(require("../interface/plugin").readPluginConfig,"reading the plug-in configuration file")});