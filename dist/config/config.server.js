"use strict";
/**
 * Configuration file for server parameter settings.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const args_1 = require("../args");
const normalize_1 = require("../utilities/normalize");
const default_json_1 = __importDefault(require("./static/default.json"));
const languages_json_1 = __importDefault(require("./static/languages.json"));
const countries_json_1 = __importDefault(require("./static/countries.json"));
const reader_1 = require("./reader");
// Retrieve web file (public) directory path on local disc.
const callDirPath = (0, path_1.dirname)(require.main.filename);
const argsDirPath = (0, args_1.argument)("path");
// Use directory at given path (argument)
// or call point directory otherwise
const projectDirPath = (typeof (argsDirPath) == "string")
    // Construct absolute path from call point if relative path given
    ? (/[^/]/.test(argsDirPath)
        ? (0, path_1.join)(callDirPath, argsDirPath)
        : argsDirPath)
    : callDirPath;
/**
 * Normalize directory to project local path.
 * @param {string} caption Error section caption
 * @param {string} name Pathname to be normalized
 * @returns {string} Normalized pathname
 */
function normalizePath(caption, name) {
    const path = (name.charAt(0) != "/")
        ? (0, path_1.join)(projectDirPath, name)
        : name;
    if (!(0, fs_1.existsSync)(path)) {
        throw new ReferenceError(`${caption} directory given in server configuration file does not exist '${path}'`);
    }
    return (0, path_1.join)(projectDirPath, name);
}
/**
 * Normalize array of extension names as given to several server configuration parameters.
 * Removes possibly given leading dots as well as translates strings to lowercase represenatation.
 * @param {string[]} array Extension name array
 * @returns Normalized extensions array
 */
function normalizeExtensionArray(array) {
    return (array || []).map(extension => {
        return (0, normalize_1.normalizeExtension)(extension);
    });
}
/**
 * Check whether a locale sub object (languages or countries, equivalent) has invalid codes given.
 * @param {string} caption Error section caption
 * @param {Object} localeObj Configuration locale sub object
 * @returns {string[]} Modified locale sub object with default code added to supported array (for disjunctive representation)
 * @throws {SyntaxError} if invalid code given (terminates app)
 * @throws {SyntaxError} if invalid code given (terminates app)
 */
function checkLocaleCode(caption, localeObj, referenceArray) {
    if (!localeObj.supported) {
        return;
    }
    // Add default code  supported array (removing duplicate entries)
    localeObj.supported = Array.from(new Set(localeObj.supported.concat(localeObj.default ? [localeObj.default] : [])));
    localeObj.supported
        .forEach((code) => {
        if (!referenceArray.includes(code)) {
            throw new SyntaxError(`Invalid ISO-2-digit ${caption} code given in server configuration file '${code}'`);
        }
    });
}
const config = ((0, reader_1.read)("config", default_json_1.default) || (0, reader_1.read)("server", default_json_1.default));
// Check locale information for correct coding
checkLocaleCode("language", config.locale.languages, languages_json_1.default);
checkLocaleCode("country", config.locale.countries, countries_json_1.default);
// Normalize extension arrays for future uniform usage behavior
(0, fs_1.existsSync)(config.directory.lang) && (config.directory.lang = normalizePath("Lang", config.directory.lang));
config.directory.log && (config.directory.log = normalizePath("Log", config.directory.log));
config.directory.web = normalizePath("Web", config.directory.web);
// Normalize extension arrays for future uniform usage behavior
config.extensionWhitelist = normalizeExtensionArray(config.extensionWhitelist);
config.gzipCompressList = normalizeExtensionArray(config.gzipCompressList);
// Normalize MIMES map object keys (representing file extensions)
const normalizedMimesMap = {};
for (const extension in config.mimes) {
    normalizedMimesMap[(0, normalize_1.normalizeExtension)(extension)] = config.mimes[extension];
}
config.mimes = normalizedMimesMap;
exports.default = config;
