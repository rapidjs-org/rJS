/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.integrateLiveReference=exports.proposeRefresh=void 0;const http_1=__importDefault(require("http")),fs_1=require("fs"),path_1=require("path"),websocket_1=require("websocket"),markup_1=require("../utilities/markup"),clientScript=String((0,fs_1.readFileSync)((0,path_1.join)(__dirname,"../client/live.js"))),webServer=http_1.default.createServer().listen(9393),wsServer=new websocket_1.server({httpServer:webServer});wsServer.on("request",handleRequest);const connections=[];function handleRequest(e){e=e.accept(null,e.origin);connections.push(e)}function proposeRefresh(){(connections||[]).forEach(e=>{e.sendUTF("1")})}function integrateLiveReference(e){return(0,markup_1.injectIntoHead)(String(e),` <script> ${clientScript} </script> `)}exports.proposeRefresh=proposeRefresh,exports.integrateLiveReference=integrateLiveReference;