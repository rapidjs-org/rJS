/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0});const config_server_1=__importDefault(require("./config/evaluated")),detection_1=require("./live/detection");require("./server/instance.js");const scope_app_1=__importDefault(require("./interface/scope:app"));(0,detection_1.registerDetection)(require("path").dirname(config_server_1.default.directory.web),()=>{process.on("exit",()=>{require("child_process").spawn(process.argv.shift(),process.argv,{cwd:process.cwd(),detached:!0,stdio:"inherit"})}),process.exit()},!1),(0,detection_1.registerDetection)(config_server_1.default.directory.web),module.exports=scope_app_1.default;