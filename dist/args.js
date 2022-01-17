/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.argument=void 0;const input=2<process.argv.length?process.argv.slice(2):[];function parse(e,t){e=e.toLowerCase();t=Math.max(input.indexOf("--"+e),t?input.indexOf("-"+t.toUpperCase()):-1);-1!=t&&(t=input[t+1],t=!/^[^-]/.test(t||"")||t,args[e]=t)}const args={};function argument(e){return args[e]||!1}parse("dev","D"),parse("path","P"),exports.argument=argument;