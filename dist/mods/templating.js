"use strict";
/**
 * Rendering engine for templating (SSR).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const config_json_1 = __importDefault(require("../config.json"));
const path_1 = require("path");
const fs_1 = require("fs");
const config_server_1 = __importDefault(require("../config/config.server"));
const output = __importStar(require("../utilities/output"));
const bindings_1 = require("../interface/bindings");
/**
 * Render templating into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Templated markup
 */
function render(markup, reducedRequestInfo, isImplicitRequest = false) {
    // Retrieve templating object if respective handler module exists (compound only)
    const templatingModulePath = (0, path_1.join)(config_server_1.default.directory.web, `${reducedRequestInfo.pathname.replace(/([^/]+$)/, `${config_json_1.default.privateWebFilePrefix}$1`)}.js`);
    let templatingObj = (reducedRequestInfo.isCompound && (0, fs_1.existsSync)(templatingModulePath))
        ? require(templatingModulePath)
        : {};
    templatingObj = (templatingObj instanceof Function)
        ? templatingObj(reducedRequestInfo) // Pass request info object to templating module if is exporting a function
        : templatingObj; // Stateless templating otherwise (regarding the individual request)
    bindings_1.templatingEngines
        // Filter for request adequate engines
        .filter(engine => {
        if (!isImplicitRequest) {
            return !engine.implicitReadingOnly;
        }
        return true;
    })
        // Apply each engine in order of registration
        .forEach(engine => {
        try {
            markup = engine.callback(markup, templatingObj, reducedRequestInfo);
        }
        catch (err) {
            output.log(`An error occurred applying the rendering engine with index ${engine.index}:`);
            output.error(err);
        }
    });
    return markup;
}
exports.render = render;
