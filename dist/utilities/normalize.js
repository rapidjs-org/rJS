/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";function normalizeExtension(e){return e.trim().replace(/^\./,"").toLowerCase()}function truncateModuleExtension(e){return e.replace(/\.(j(ava)?|t(ype)?)s(cript)?$/i,"")}Object.defineProperty(exports,"__esModule",{value:!0}),exports.truncateModuleExtension=exports.normalizeExtension=void 0,exports.normalizeExtension=normalizeExtension,exports.truncateModuleExtension=truncateModuleExtension;