/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.ArbitraryCache=void 0;const Cache_1=require("./Cache");class ArbitraryCache extends Cache_1.Cache{constructor(e){super(e)}setNormalization(e){this.normalizationCallback=e}}exports.ArbitraryCache=ArbitraryCache;