"use strict";
/**
 * Rendering engine for locale dependant information.
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
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../config/config.server"));
const output = __importStar(require("../utilities/output"));
// TODO: What about accept language header?
function render(markup, reducedRequestInfo) {
    if (!reducedRequestInfo.locale
        || !reducedRequestInfo.locale.lang) {
        // Language processing disabled
        return markup;
    }
    // Retrieve related language translation file(s)
    const langFilePaths = [];
    const langFileName = `${reducedRequestInfo.locale.lang}.json`;
    // Compound language file (for compound pages)
    if (reducedRequestInfo.isCompound) {
        const compoundLangFilePath = (0, path_1.join)(config_server_1.default.directory.web, (0, path_1.dirname)(reducedRequestInfo.pathname), langFileName);
        (0, fs_1.existsSync)(compoundLangFilePath)
            && langFilePaths.push(compoundLangFilePath);
    }
    // General language file
    const generalLangFilePath = (0, path_1.join)(config_server_1.default.directory.lang, langFileName);
    (0, fs_1.existsSync)(generalLangFilePath)
        && langFilePaths.push(generalLangFilePath);
    // Scan translation marks
    // Intermediately convert to set for duplicate entry elimination
    const marks = Array.from(new Set(markup.match(/\[%\s*([a-zA-Z_][a-zA-Z0-9_]*)(\s*\.\s*[a-zA-Z_][a-zA-Z0-9_]*)*\s*%\]/g)));
    // Translate (substitute) marks in markup based on language files (scan)
    // Look up in local (compound directory deployed) files first, general (lang directory deployed) last
    marks.forEach(mark => {
        // Extract mark name
        const markName = mark
            .replace(/^\[%/, "")
            .replace(/%\]$/, "")
            .replace(/\s+/g, "")
            .split(/\./g);
        // Retrieve mark substitute value
        let substitute = ""; // Empty translation if no value will be found
        for (let i = 0; i < langFilePaths.length; i++) {
            let langObj;
            try {
                langObj = require(langFilePaths[i]);
            }
            catch (err) {
                // Malformed language file
                output.log(`Malformed language literals JSON '${langFilePaths[i]}'`);
                output.error(err);
                continue;
            }
            // TODO: Handle nested values
            if (substitute = langObj[markName[0]]) {
                break;
            }
        }
        // Substitute mark with literal value
        markup = markup.replace(new RegExp(mark.replace(/(\[|\])/, "\\$1")), substitute);
    });
    return markup;
}
exports.render = render;
// TODO: lang attr (HTML)
