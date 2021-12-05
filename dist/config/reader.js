/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.read=void 0;const config={filePrefix:"rapid.",devSuffix:".dev"},path_1=require("path"),fs_1=require("fs"),is_dev_mode_1=__importDefault(require("../utilities/is-dev-mode"));function read(e){var i=(0,path_1.join)(__dirname,`./default/${e}.json`),t=(0,fs_1.existsSync)(i)?require(i):{},e=(0,path_1.join)((0,path_1.dirname)(require.main.filename),""+config.filePrefix+e+(is_dev_mode_1.default?config.devSuffix:"")+".json");const r=(0,fs_1.existsSync)(e)?require(e):{};for(const s in t)"Object"===(t[s]||"").constructor.name&&"Object"===(r[s]||"").constructor.name&&(r[s]=Object.assign(Object.assign({},t[s]),r[s]));return Object.assign(Object.assign({},t),r)}exports.read=read;