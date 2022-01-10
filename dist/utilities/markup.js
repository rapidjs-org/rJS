"use strict";
// TODO: Multiple insertion points (at top)?
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectIntoHead = void 0;
/**
 * Inject a markup sequence into a original markup's head tag (only if head tag exists).
 * @param {string} origData Markup to inject a given sequence into
 * @param {string} insertData Injection sequence
 * @param {boolean} [atBottom=false] Whether to insert sequence at bottom of head (at top otherwise)
 * @returns {string} Injected host data
 */
function injectIntoHead(origData, insertData, atBottom = false) {
    // Match head tags
    const headTagMatch = {
        open: origData.match(/<\s*head((?!>)(\s|.))*>/),
        close: origData.match(/<\s*\/head((?!>)(\s|.))*>/)
    };
    if (!headTagMatch.open || !headTagMatch.close) {
        // No head tag
        return origData;
    }
    const headTagIndex = {
        open: origData.indexOf(headTagMatch.open[0]) + headTagMatch.open[0].length,
        close: origData.indexOf(headTagMatch.close[0])
    };
    // Retrieve top index offset (before first hardcoded script tag)
    // So tags located on top of head are placed before (could be important e.g. for meta tags)
    const openOffset = origData
        .slice(headTagIndex.open, headTagIndex.close)
        .search(/<\s*script(\s|>)/);
    // Insert sequence
    const pivot = (!atBottom && openOffset >= 0)
        ? headTagIndex.open + openOffset
        : headTagIndex.close; // Insert index
    insertData = `\n${insertData}\n`;
    return `${origData.slice(0, pivot)}${insertData}${origData.slice(pivot)}`;
}
exports.injectIntoHead = injectIntoHead;
