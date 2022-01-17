/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.ResponseError=void 0;class ResponseError extends Error{constructor(r,e,s){super(s);r*=100;if(!Number.isInteger(e)||e<r||99+r<e)throw new RangeError(`Invalid error status code thrown '${e}' [${r}, ${99+r}]`);this.status=e}}exports.ResponseError=ResponseError;