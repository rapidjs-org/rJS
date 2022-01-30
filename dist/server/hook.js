/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.currentRequestInfo=exports.createHook=void 0;const async_hooks_1=__importDefault(require("async_hooks")),requests=new Map,asyncHook=async_hooks_1.default.createHook({init:(e,t,s)=>{requests.has(s)&&requests.set(e,requests.get(s))},destroy:e=>{requests.has(e)&&requests.delete(e)}});function createHook(e){requests.set(async_hooks_1.default.executionAsyncId(),e)}function currentRequestInfo(){const e=requests.get(async_hooks_1.default.executionAsyncId());return e?e.getRequestObject():void 0}asyncHook.enable(),exports.createHook=createHook,exports.currentRequestInfo=currentRequestInfo;