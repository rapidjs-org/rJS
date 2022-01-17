/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __createBinding=this&&this.__createBinding||(Object.create?function(e,t,r,u){void 0===u&&(u=r),Object.defineProperty(e,u,{enumerable:!0,get:function(){return t[r]}})}:function(e,t,r,u){e[u=void 0===u?r:u]=t[r]}),__setModuleDefault=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t}),__importStar=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)"default"!==r&&Object.prototype.hasOwnProperty.call(e,r)&&__createBinding(t,e,r);return __setModuleDefault(t,e),t};Object.defineProperty(exports,"__esModule",{value:!0}),exports.wrapInterface=void 0;const output=__importStar(require("../utilities/output"));function wrapInterface(t,r,u=!1){return(...e)=>{try{return t(...e)}catch(e){output.log(`An error occurred${r?" "+r:""}:`),output.error(e,u)}}}exports.wrapInterface=wrapInterface;