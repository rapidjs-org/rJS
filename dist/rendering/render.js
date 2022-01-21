/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.renderModifiers=void 0;const hook_1=require("../server/hook"),templating_1=__importDefault(require("./templating")),locale_1=__importDefault(require("./locale/locale")),handlerQueue=[templating_1.default,locale_1.default];function renderModifiers(r,t=!1){const o=(0,hook_1.currentRequestInfo)();return handlerQueue.forEach(e=>{r=e(r,o,t)}),r}exports.renderModifiers=renderModifiers;