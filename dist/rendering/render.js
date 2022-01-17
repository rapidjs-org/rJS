/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.renderModifiers=void 0;const hook_1=require("../server/hook"),templating_1=require("./templating"),locale_1=require("./locale/locale"),handlerQueue=[templating_1.render,locale_1.render];function renderModifiers(r,o=!1){const n=(0,hook_1.currentRequestInfo)();return handlerQueue.forEach(e=>{r=e(r,n,o)}),r}exports.renderModifiers=renderModifiers;