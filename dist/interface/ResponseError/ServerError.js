/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.ServerError=void 0;const ResponseError_1=require("./ResponseError");class ServerError extends ResponseError_1.ResponseError{constructor(r,e){super(5,r,e)}}exports.ServerError=ServerError;