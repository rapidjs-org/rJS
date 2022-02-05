/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.rateExceeded=void 0;const config_server_1=__importDefault(require("../config/evaluated")),periodLength=6e4,limiter={windowStart:0,previous:null,current:null};function updateWindow(){var e=Date.now();let r=Math.abs(limiter.windowStart-e);return r>=periodLength&&(limiter.previous=!(r>=2*periodLength)&&limiter.current||{},limiter.current={},r%=periodLength,limiter.windowStart=e-r),r/periodLength}function rateExceeded(e){if(!config_server_1.default.limit.requestsPerMin)return!1;var r=updateWindow();return Math.floor(r*(limiter.current[e]||0)+(1-r)*(limiter.previous[e]||0))>=config_server_1.default.limit.requestsPerMin||(limiter.current[e]=isNaN(limiter.current[e])?0:++limiter.current[e],!1)}exports.rateExceeded=rateExceeded;