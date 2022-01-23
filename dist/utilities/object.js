/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";function merge(e,t){for(const r of Object.keys(e).concat(Object.keys(t)))"Object"===(e[r]||"").constructor.name&&"Object"===(t[r]||"").constructor.name?t[r]=merge(e[r],t[r]):e[r]=t[r]||e[r];return Object.assign(Object.assign({},e),t)}Object.defineProperty(exports,"__esModule",{value:!0}),exports.merge=void 0,exports.merge=merge;