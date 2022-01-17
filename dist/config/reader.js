/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.read=void 0;const config={filePrefix:"rapid.",devSuffix:".dev"},path_1=require("path"),fs_1=require("fs"),is_dev_mode_1=__importDefault(require("../utilities/is-dev-mode"));function merge(e,r){for(const t in e)"Object"===(e[t]||"").constructor.name&&"Object"===(r[t]||"").constructor.name&&(r[t]=Object.assign(e[t],r[t]));return Object.assign(Object.assign({},e),r)}function readCustomConfig(e,r=!1){r=(0,path_1.join)((0,path_1.dirname)(require.main.filename),""+config.filePrefix+e+(r?config.devSuffix:"")+".json");return(0,fs_1.existsSync)(r)?require(r):{}}function read(e,r={}){e=merge(readCustomConfig(e),is_dev_mode_1.default?readCustomConfig(e,!0):{});return merge(r,e)}exports.read=read;