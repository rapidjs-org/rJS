/**
 * rapidJS: Automatic serving, all-implicit-routing, pluggable fullstack scoped
 *          function modules, un-opinionated templating. 
 * 
 * Copyright (c) Thassilo Martin Schiepanski
 */
"use strict";var __importDefault=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0}),exports.exists=exports.read=void 0;const config_json_1=__importDefault(require("../config.json")),fs_1=require("fs"),path_1=require("path"),config_server_1=__importDefault(require("../config/evaluated")),normalize_1=require("../utilities/normalize"),render_1=require("../rendering/render");function read(e){var r=(0,path_1.join)(config_server_1.default.directory.web,e);let i=String((0,fs_1.readFileSync)(r));return i=(0,normalize_1.normalizeExtension)((0,path_1.extname)(e))===config_json_1.default.dynamicFileExtension?(0,render_1.renderModifiers)(i):i,i}function exists(e){return!!(0,fs_1.existsSync)((0,path_1.join)(config_server_1.default.directory.web,e))}exports.read=read,exports.exists=exists;