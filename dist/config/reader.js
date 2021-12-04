"use strict";
/**
 * Configuration file reader.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.read = void 0;
const config = {
    filePrefix: "rapid.",
    devSuffix: ".dev"
};
const path_1 = require("path");
const fs_1 = require("fs");
const is_dev_mode_1 = __importDefault(require("../utilities/is-dev-mode"));
/**
 * Read an merge configuration files/objects respectively (2 levels deep).
 * @param {string} name Configuration file name (formatted)
 * @returns {Object} Resulting configuration object
 */
function read(name) {
    // Retrieve default config object
    const defaultConfigPath = (0, path_1.join)(__dirname, `./default/${name}.json`);
    const defaultConfig = (0, fs_1.existsSync)(defaultConfigPath) ? require(defaultConfigPath) : {};
    // Retrieve custom config object (depending on mode)
    const customConfigPath = (0, path_1.join)((0, path_1.dirname)(require.main.filename), `${config.filePrefix}${name}${is_dev_mode_1.default ? config.devSuffix : ""}.json`);
    const customConfig = (0, fs_1.existsSync)(customConfigPath) ? require(customConfigPath) : {};
    // Explicitly merge sub objects
    for (const key in defaultConfig) {
        if ((defaultConfig[key] || "").constructor.name !== "Object"
            || (customConfig[key] || "").constructor.name !== "Object") {
            continue; // No sub objects for both objects given
        }
        customConfig[key] = Object.assign(Object.assign({}, defaultConfig[key]), customConfig[key]);
    }
    return Object.assign(Object.assign({}, defaultConfig), customConfig); // Merge top level
}
exports.read = read;
