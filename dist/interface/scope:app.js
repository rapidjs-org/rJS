/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const wrapper_1=require("./wrapper"),bindSSR=(0,wrapper_1.wrapInterface)(require("./bindings").bindSSR,"binding an SSR handler",!0);exports.default={plugin:(0,wrapper_1.wrapInterface)(require("./plugin/registry").bind,"connecting a plug-in",!0),bindSSR:bindSSR,bindTemplating:bindSSR,bindLocale:(0,wrapper_1.wrapInterface)(require("./bindings").bindLocale,"binding the locale handler",!0)};