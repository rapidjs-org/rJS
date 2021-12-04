/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.exists=exports.read=void 0;const config_json_1=__importDefault(require("../config.json")),fs_1=require("fs"),path_1=require("path"),web_path_1=__importDefault(require("../utilities/web-path")),normalize_1=require("../utilities/normalize"),modifiers_1=require("../mods/modifiers"),ClientError_1=require("./ClientError");function read(e){var r=(0,path_1.join)(web_path_1.default,e);if(!(0,fs_1.existsSync)(r))throw new ClientError_1.ClientError(404);let t=String((0,fs_1.readFileSync)(r));return t=(0,normalize_1.normalizeExtension)((0,path_1.extname)(e))===config_json_1.default.dynamicFileExtension?(0,modifiers_1.renderModifiers)(t):t,Buffer.from(t,"utf-8")}function exists(e){return!!(0,fs_1.existsSync)((0,path_1.join)(web_path_1.default,e))}exports.read=read,exports.exists=exists;