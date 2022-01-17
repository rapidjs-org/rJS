/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";function injectIntoHead(e,o,n=!1){var s={open:e.match(/<\s*head((?!>)(\s|.))*>/),close:e.match(/<\s*\/head((?!>)(\s|.))*>/)};if(!s.open||!s.close)return e;var t={open:e.indexOf(s.open[0])+s.open[0].length,close:e.indexOf(s.close[0])},s=e.slice(t.open,t.close).search(/<\s*script(\s|>)/),t=!n&&0<=s?t.open+s:t.close;return o+=` `,""+e.slice(0,t)+o+e.slice(t)}Object.defineProperty(exports,"__esModule",{value:!0}),exports.injectIntoHead=void 0,exports.injectIntoHead=injectIntoHead;