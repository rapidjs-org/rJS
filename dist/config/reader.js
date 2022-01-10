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
 * 2 level deep merge objects with right associative override.
 * @param {Object} obj1 Object 1
 * @param {Object} obj2 Object 2 (overriding)
 * @returns {Object} Merged object.
 */
function merge(obj1, obj2) {
    // Explicitly merge sub objects
    for (const key in obj1) {
        if ((obj1[key] || "").constructor.name !== "Object"
            || (obj2[key] || "").constructor.name !== "Object") {
            continue; // No sub objects for both objects given
        }
        obj2[key] = Object.assign(Object.assign({}, obj1[key]), obj2[key]);
    }
    return Object.assign(Object.assign({}, obj1), obj2); // Merge top level
}
/**
 * Read a custom config file
 * @param {string} name Configuration file name (formatted)
 * @param {boolean} [devConfig] Whether to read DEV MODE specific file (with suffix)
 * @returns {Object} Configuration object
 */
function readCustomConfig(name, devConfig = false) {
    // Retrieve custom config object (depending on mode)
    const customConfigPath = (0, path_1.join)((0, path_1.dirname)(require.main.filename), `${config.filePrefix}${name}${devConfig ? config.devSuffix : ""}.json`);
    return (0, fs_1.existsSync)(customConfigPath) ? require(customConfigPath) : {};
}
/**
 * Read an merge configuration files/objects respectively (2 levels deep).
 * @param {string} name Configuration file name (formatted)
 * @param {Object} [defaultConfig] Default configuration object
 * @returns {Object} Resulting configuration object
 */
function read(name, defaultConfig = {}) {
    // Retrieve custom config object (depending on mode)
    const customConfig = merge(readCustomConfig(name), is_dev_mode_1.default ? readCustomConfig(name, true) : {});
    return merge(defaultConfig, customConfig);
}
exports.read = read;
