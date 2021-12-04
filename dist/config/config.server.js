/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const normalize_1=require("../utilities/normalize"),reader_1=require("./reader");function normalizeExtensionArray(e){return(e||[]).map(e=>(0,normalize_1.normalizeExtension)(e))}const config=(0,reader_1.read)("config");config.extensionWhitelist=normalizeExtensionArray(config.extensionWhitelist),config.gzipCompressList=normalizeExtensionArray(config.gzipCompressList),exports.default=config;