/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0});const config_json_1=__importDefault(require("../config.json")),path_1=require("path"),fs_1=require("fs"),config_server_1=__importDefault(require("../config/config.server")),bindings_1=require("../interface/bindings");function default_1(e,r,i=!1){var t=(0,path_1.join)(config_server_1.default.directory.web,r.pathname.replace(/([^/]+$)/,config_json_1.default.privateWebFilePrefix+"$1")+".js");let n=r.isCompound&&(0,fs_1.existsSync)(t)?require(t):{};return n=n instanceof Function?n(require("../interface/scope:common"),r):n,e=bindings_1.ssrEngine.apply(e,[n,r],i)}exports.default=default_1;