/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.bind=void 0;const bindings_1=require("./bindings");function bind(i,n=!1){bindings_1.templatingEngines.push({callback:i,implicitReadingOnly:n})}exports.bind=bind;