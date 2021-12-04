"use strict";
/**
 * Retrieve web file (public) directory path on local disc.
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
const path_1 = require("path");
const fs_1 = require("fs");
const config_server_1 = __importDefault(require("../config/config.server"));
const output = __importStar(require("./output"));
const webDirName = config_server_1.default.webDirectory;
if (webDirName.match(/[<>:"/\\|?*]/)) {
    output.error(new SyntaxError(`'${webDirName}' is not a valid directory name. Contains disallowed characters from {<, >, :, ", /, \\, ,|, ?, *}.`), true);
}
const webDirPath = (0, path_1.join)((0, path_1.dirname)(require.main.filename), webDirName);
if (!(0, fs_1.existsSync)(webDirPath)) {
    output.error(new ReferenceError(`Web file directory does not exist at '${webDirPath}'`), true);
}
exports.default = webDirPath;
