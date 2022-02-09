/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const wrapper_1=require("./wrapper"),endpoint=(0,wrapper_1.wrapInterface)(require("./plugin/endpoint").setDefaultEndpoint,"creating a plugin endpoint",!0),namedEndpoint=(0,wrapper_1.wrapInterface)(require("./plugin/endpoint").setNamedEndpoint,"creating a named plugin endpoint",!0);module.exports={clientModule:(0,wrapper_1.wrapInterface)(require("./plugin/registry").initClientModule,"initializing a client module",!0),endpoint:endpoint,namedEndpoint:namedEndpoint,setEndpoint:endpoint,setNamedEndpoint:namedEndpoint};