/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const wrapper_1=require("./wrapper");module.exports=Object.assign(Object.assign(Object.assign({},require("./interface:shared")),require("./Environment")),{isDevMode:require("../utilities/is-dev-mode"),plugin:(0,wrapper_1.wrapInterface)(require("./plugin/register").bind,"connecting a plug-in",!0),bindTemplating:(0,wrapper_1.wrapInterface)(require("../mods/templating").bind,"binding a templating handler",!0)});