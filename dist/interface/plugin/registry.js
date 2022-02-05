/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __createBinding=this&&this.__createBinding||(Object.create?function(e,i,n,r){void 0===r&&(r=n),Object.defineProperty(e,r,{enumerable:!0,get:function(){return i[n]}})}:function(e,i,n,r){e[r=void 0===r?n:r]=i[n]}),__setModuleDefault=this&&this.__setModuleDefault||(Object.create?function(e,i){Object.defineProperty(e,"default",{enumerable:!0,value:i})}:function(e,i){e.default=i}),__importStar=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var i={};if(null!=e)for(var n in e)"default"!==n&&Object.prototype.hasOwnProperty.call(e,n)&&__createBinding(i,e,n);return __setModuleDefault(i,e),i},__importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.initClientModule=exports.retrieveClientModules=exports.isClientModuleRequest=exports.integratePluginReferences=exports.bind=exports.bindPlugin=exports.pluginRegistry=void 0;const config={configFilePluginScopeName:"plug-in",coreModuleIdentifier:"core",pluginConfigIdentifier:"pluginConfig",clientModuleAppName:"rapidJS",clientModuleReferenceName:{shared:"SHARED",public:"PUBLIC"},pluginNameRegex:/(@[a-z0-9+-][*a-z0-9._-]*\/)?[a-z0-9+-][a-z0-9._-]*/,pluginNameSeparator:"+",pluginRequestPrefix:"plug-in::",thisRetainerIdentifier:"$this"},Module=require("module"),path_1=require("path"),fs_1=require("fs"),config_plugins_1=__importDefault(require("../../config/evaluated")),detection_1=require("../../live/detection"),output=__importStar(require("../../utilities/output")),markup_1=require("../../utilities/markup"),normalize_1=require("../../utilities/normalize"),naming_1=require("./naming"),pluginNameRegex=new RegExp(`^${config.pluginNameRegex.source}$`,"i"),urlPrefixRegex=new RegExp("^\\/"+config.pluginRequestPrefix,"i");function bindPlugin(o,i){require.cache[i]&&delete require.cache[i];const l=config_plugins_1.default[o]||void 0;let e;try{var n=Module.wrap;Module.wrap=(e,i,n,r,t)=>`${Module.wrapper[0]} const console = { log: message => { require("${require.resolve("../../utilities/output")}").log(message, "${o}") }, error: err => { require("${require.resolve("../../utilities/output")}").error(err, false, "${o}"); } }; for(const inter in require("${require.resolve("../scope:plugin")}")) { this[inter] = require("${require.resolve("../scope:plugin")}")[inter]; } this.${config.pluginConfigIdentifier} = ${JSON.stringify(l)}; const ${config.thisRetainerIdentifier} = this; `+e+Module.wrapper[1],e=require.main.require(i),Module.wrap=n}catch(e){throw e.message+=` - `+i,e}e instanceof Function&&(e(require("../scope:common")),output.log("↴ "+o))}function bind(e,i={}){if(i.alias&&!pluginNameRegex.test(i.alias.trim()))throw new SyntaxError(`Invalid plug-in alias given '', '${e}'`);const n=i.alias?i.alias.trim():(0,naming_1.getNameByReference)(e);if(n===config.coreModuleIdentifier)throw new SyntaxError(`Plug-in referenced by '${e}' resolved to the reserved name 'core'.`);if(exports.pluginRegistry.has(n))throw new ReferenceError(`More than one plug-in reference resolve to the name '${n}'`);const r=Module._resolveFilename(e,require.main);return pluginNameRegex.test(e)||(0,detection_1.registerDetection)((0,path_1.dirname)(r),()=>{bindPlugin(n,r)}),exports.pluginRegistry.set(n,{path:(0,normalize_1.truncateModuleExtension)(r),specific:i.specific}),bindPlugin(n,r)}function integratePluginReferences(i,n){const e=Array.from(exports.pluginRegistry.keys()).filter(e=>{e=exports.pluginRegistry.get(e);return!e.specific&&e.clientScript&&(n||!e.compoundOnly)}).filter(e=>!new RegExp(`<\\s*script\\s+((async|defer)\\s+)?src=("|')\\s*/\\s*${config.pluginRequestPrefix}${e}\\s*\\1(\\s+(async|defer))?\\s*>`,"i").test(i));if(e.length<=1)return i;var r="/"+config.pluginRequestPrefix+e.join(config.pluginNameSeparator);return i=(0,markup_1.injectIntoHead)(i,` <script src="${r}"></script> `)}function isClientModuleRequest(e){return!!new RegExp(`^${urlPrefixRegex.source}${config.pluginNameRegex.source}(\\${config.pluginNameSeparator}${config.pluginNameRegex.source})*`,"i").test(e)}function retrieveClientModules(e){return Buffer.from(e.replace(urlPrefixRegex,"").split(new RegExp("\\"+config.pluginNameSeparator,"g")).filter(e=>config.pluginNameRegex.test(e)&&exports.pluginRegistry.has(e)&&exports.pluginRegistry.get(e).clientScript).map(e=>exports.pluginRegistry.get(e).clientScript).join("\n"),"utf-8")}function initClientModule(e,i,n){var r=(0,naming_1.getNameByCall)(__filename);if(/^\//.test(e))throw new SyntaxError(`Expecting relative path to plug-in client module upon initialization, given absolute path '${e}' for '${r}'`);var t=(0,naming_1.getPathByCall)(__filename);let o=(0,path_1.join)(t,e);if(o=0==(0,path_1.extname)(o).length?o+".js":o,!(0,fs_1.existsSync)(o))throw new ReferenceError(`Client module file for plug-in '${r}' not found at given path '${o}'`);const l=String((0,fs_1.readFileSync)(o));i=[` ${config.clientModuleAppName} = { ... ${config.clientModuleAppName}, ... { "${r}": (_ => { const console = { log: message => { const atomic = ["string", "number", "boolean"].includes(typeof(message)); window.console.log(\`%c[rJS]%c[${r}] %c\${atomic ? message : "↓"}\`, "color: gold;", "color: DarkTurquoise;", "color: auto;"); !atomic && window.console.log(message); }, error: err => { window.console.log(\`%c[rJS]%c[${r}] %c\${err.message}\`, "color: gold;", "color: DarkTurquoise;", "color: red;"); window.console.error(err); } }; const endpoint = { use: (body, progressHandler) => { return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${r}", body, progressHandler); }, useNamed: (name, body, progressHandler) => { return ${config.clientModuleAppName}.${config.coreModuleIdentifier}.toEndpoint("${r}", body, progressHandler, name); } }; const ${config.thisRetainerIdentifier} = { endpoint: endpoint.use, useEndpoint: endpoint.use, namedEndpoint: endpoint.useNamed, useNamedEndpoint: endpoint.useNamed, ${config.clientModuleReferenceName.public}: {}, ${config.clientModuleReferenceName.shared}: ${JSON.stringify(i)} }; for(const member in ${config.thisRetainerIdentifier}) { this[member] = ${config.thisRetainerIdentifier}[member] } delete endpoint; `,` return ${config.thisRetainerIdentifier}.${config.clientModuleReferenceName.public}; })() } } `].map(e=>e.replace(/([{};,])\s+/g,"$1").trim());const u=exports.pluginRegistry.get(r);u.clientScript=Buffer.from(""+i[0]+l+(";"!=l.slice(-1)?";":"")+i[1],"utf-8"),u.compoundOnly=n}exports.pluginRegistry=new Map,exports.pluginRegistry.set("core",{path:null,specific:!1,clientScript:(0,fs_1.readFileSync)((0,path_1.join)(__dirname,"../../client/core.js"))}),exports.bindPlugin=bindPlugin,exports.bind=bind,exports.integratePluginReferences=integratePluginReferences,exports.isClientModuleRequest=isClientModuleRequest,exports.retrieveClientModules=retrieveClientModules,exports.initClientModule=initClientModule;