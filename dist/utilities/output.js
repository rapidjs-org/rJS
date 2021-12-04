/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.error=exports.log=void 0;const config={appName:"rJS"};function log(o,r){console.log("[33m%s"+(r?r+"%s[0m":"[0m%s"),`[${config.appName}] `,o)}function error(o,r=!1){log(o instanceof Error?o.name+": "+o.message:o,"[31m"),console.error(Array.from(o.stack).map(o=>"at "+String(o)).join("\n")),r&&process.exit()}exports.log=log,exports.error=error;