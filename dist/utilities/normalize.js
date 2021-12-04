"use strict";
/**
 * Normalization helper functions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExtension = void 0;
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
