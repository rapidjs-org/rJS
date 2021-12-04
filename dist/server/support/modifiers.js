/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.applyModifiers=void 0;const templating_1=__importDefault(require("../../mods/templating")),locale_1=__importDefault(require("../../mods/locale")),handlerQueue=[templating_1.default,locale_1.default];function applyModifiers(e){let t=String(e);return handlerQueue.forEach(e=>{t=e(t)}),Buffer.from(t,"utf-8")}exports.applyModifiers=applyModifiers;