"use strict";
/**
 * Plug-in naming related routines.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPluginConfig = exports.getNameByReference = exports.getNameByCall = exports.getPathByCall = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../../config/config.server"));
const config_plugins_1 = __importDefault(require("../../config/config.plugins"));
const normalize_1 = require("../../utilities/normalize");
const bindings_1 = require("../bindings");
/**
 * Get path to plug-in module that activated calling function.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in module / caller path
 */
function getCallerPath(fileName) {
    const err = new Error();
    Error.prepareStackTrace = (_, stack) => {
        return stack;
    };
    while (err.stack.length) {
        // @ts-ignore
        if (![fileName || "", __filename].includes(err.stack.shift().getFileName())) {
            // @ts-ignore
            return err.stack.shift().getFileName();
        }
    }
    throw new ReferenceError("Failed to retrieve path to plug-in caller module");
}
/**
 * Get a plug-in directory path by respective module motivated call.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in path
 */
function getPathByCall(fileName) {
    return (0, path_1.dirname)(getCallerPath(fileName));
}
exports.getPathByCall = getPathByCall;
/**
 * Get a plug-in name by respective module motivated call.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in name
 */
function getNameByCall(fileName) {
    const path = (0, normalize_1.truncateModuleExtension)(getCallerPath(fileName));
    // Iterate plug-in registry for matching plug-in and caller path to retrieve related name
    try {
        bindings_1.pluginRegistry.forEach((_, name) => {
            if (bindings_1.pluginRegistry.get(name).path === path) {
                throw name;
            }
        });
    }
    catch (thrown) {
        // Use thrown string as for callback loop break
        if (typeof thrown === "string") {
            return String(thrown); // TODO: Store in map?
        }
        // Pass possible actual error
        throw thrown;
    }
    return undefined;
}
exports.getNameByCall = getNameByCall;
/**
 * Get a plug-in name by reference (dependency identifier or file system path).
 * Name derivation strategy:
 * Use dependency identifier if given
 * Use package name if exists at given path
 * Use resolving base file name (without extension) otherwise
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in name
 */
function getNameByReference(reference) {
    // Installed plug-in dependency (use package name as given)
    if (!/^((\.)?\.)?\//.test(reference)) {
        return reference.toLowerCase();
    }
    // Locally deployed plug-in, path given (construct absolute local path file name)
    if (/^[^/]/.test(reference)) {
        reference = (0, path_1.join)((0, path_1.dirname)(require.main.filename), reference);
    }
    const packagePath = (0, path_1.join)((0, path_1.dirname)(reference), "package.json");
    const name = (0, fs_1.existsSync)(packagePath) ? require(packagePath).name : null;
    if (name) {
        // Local plug-in with named package (use package name)
        return name.toLowerCase();
    }
    // Local plug-in without (named) package (use file name (without extension))
    return (0, normalize_1.truncateModuleExtension)((0, path_1.basename)(reference));
}
exports.getNameByReference = getNameByReference;
/**
 * Read a parameter value from the plug-in specific configuration file.
 * Automatically using plug-in scope, i.e. configuration sub object with the reading plug-in's name as key
 * @param {string} key Parameter key
 * @returns {string|number|boolean} Respective value if defined
 */
function readPluginConfig(key) {
    const pluginKey = getNameByCall(__filename);
    let subObj = config_plugins_1.default[pluginKey];
    if (subObj) {
        return subObj ? subObj[key] : undefined;
    }
    // Look in server config plug-in section (old paradigm)
    // TODO: Deprecate (mid-term)
    subObj = config_server_1.default[pluginKey];
    return subObj ? subObj[key] : undefined;
}
exports.readPluginConfig = readPluginConfig;
