/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.UrlCache=void 0;const path_1=require("path"),Cache_1=require("./Cache");class UrlCache extends Cache_1.Cache{constructor(e){super(e),this.normalizationCallback=e=>(0,path_1.normalize)(e)}}exports.UrlCache=UrlCache;