/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.Cache=void 0;const config_server_1=__importDefault(require("../../config/evaluated")),is_dev_mode_1=__importDefault(require("../../utilities/mode"));class Cache{constructor(t){this.storage=new Map,this.duration=!t||isNaN(t)||t<=0?null:config_server_1.default.cachingDuration.server}applyNormalizationCallback(t){return this.normalizationCallback?this.normalizationCallback(t):t}isEmpty(t){return!this.duration||this.storage.get(t).time+(this.duration||1/0)<Date.now()&&(this.storage.delete(t),!0)}exists(t){return!is_dev_mode_1.default&&(t=this.applyNormalizationCallback(t),!this.isEmpty(t))}read(t){return t=this.applyNormalizationCallback(t),this.isEmpty(t)?void 0:this.storage.get(t).data}write(t,e){this.duration&&this.storage.set(t,{time:Date.now(),data:e})}}exports.Cache=Cache;