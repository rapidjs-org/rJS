/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";function injectIntoHead(e,o,t=!1){var n={open:e.match(/<\s*head((?!>)(\s|.))*>/),close:e.match(/<\s*\/head((?!>)(\s|.))*>/)};return n.open&&n.close?t?e.replace(n.close[0],""+o+n.close[0]):e.replace(n.open[0],""+n.open[0]+o):e}Object.defineProperty(exports,"__esModule",{value:!0}),exports.injectIntoHead=void 0,exports.injectIntoHead=injectIntoHead;