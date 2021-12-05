/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.createCache=void 0;const ArbitraryCache_1=require("../server/support/cache/ArbitraryCache"),wrapper_1=require("./wrapper");function createCache(e){return(0,wrapper_1.wrapInterface)(()=>new ArbitraryCache_1.ArbitraryCache(e),"creating a dedicated cache")}exports.createCache=createCache;