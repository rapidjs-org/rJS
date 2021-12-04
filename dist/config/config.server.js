"use strict";
/**
 * Configuration file for server parameter settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const normalize_1 = require("../utilities/normalize");
const reader_1 = require("./reader");
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
const config = (0, reader_1.read)("config");
// Normalize extension arrays for future uniform usage behavior
config.extensionWhitelist = normalizeExtensionArray(config.extensionWhitelist);
config.gzipCompressList = normalizeExtensionArray(config.gzipCompressList);
exports.default = config;
