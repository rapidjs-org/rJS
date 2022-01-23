/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.read=void 0;const config={filePrefix:"rapid.",devSuffix:".dev"},path_1=require("path"),fs_1=require("fs"),is_dev_mode_1=__importDefault(require("../utilities/is-dev-mode")),object_1=require("../utilities/object");function readCustomConfig(e,i=!1){i=(0,path_1.join)((0,path_1.dirname)(require.main.filename),""+config.filePrefix+e+(i?config.devSuffix:"")+".json");return(0,fs_1.existsSync)(i)?require(i):{}}function read(e,i={}){e=(0,object_1.merge)(readCustomConfig(e),is_dev_mode_1.default?readCustomConfig(e,!0):{});return(0,object_1.merge)(i,e)}exports.read=read;