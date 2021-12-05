/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.render=void 0;const bindings_1=require("../interface/bindings"),hook_1=require("../server/hook");function render(r,n=!1){const i={};return bindings_1.templatingEngines.filter(e=>!!n||!e.implicitReadingOnly).forEach(e=>{r=e.callback(r,i,(0,hook_1.currentRequestInfo)())}),r}exports.render=render;