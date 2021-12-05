/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.renderModifiers=void 0;const templating_1=require("./templating"),locale_1=require("./locale"),handlerQueue=[templating_1.render,locale_1.render];function renderModifiers(r,i=!1){return handlerQueue.forEach(e=>{r=e(r,i)}),r}exports.renderModifiers=renderModifiers;