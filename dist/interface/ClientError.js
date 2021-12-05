/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.ClientError=void 0;class ClientError{constructor(r){if(!Number.isInteger(r)||r<400||499<r)throw new RangeError(`Invalid client error status code ${r} given`);this.status=r}}exports.ClientError=ClientError;