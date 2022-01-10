"use strict";
/**
 * Normalization helper functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncateModuleExtension = exports.normalizeExtension = void 0;
/**
 * Normalize file extension.
 * Remove possibly given leading dot and convert to all lowercase representation.
 * @param {string} extension Raw extension sequence
 * @returns {string} Normalized extension
 */
function normalizeExtension(extension) {
    return extension
        .trim()
        .replace(/^\./, "")
        .toLowerCase();
}
exports.normalizeExtension = normalizeExtension;
/**
 * Remove module related extension for given path or file name.
 * .{js, ts, javascript, typescript}
 * @param {string} name Name to truncate
 * @returns {string} Truncated name
 */
function truncateModuleExtension(name) {
    return name.replace(/\.(j(ava)?|t(ype)?)s(cript)?$/i, "");
}
exports.truncateModuleExtension = truncateModuleExtension;
