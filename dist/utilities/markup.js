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
    const headTag = {
        open: origData.match(/<\s*head((?!>)(\s|.))*>/),
        close: origData.match(/<\s*\/head((?!>)(\s|.))*>/)
    };
    if (!headTag.open || !headTag.close) {
        // No head tag
        return origData;
    }
    // Insert sequence
    return atBottom
        ? origData.replace(headTag.close[0], `${insertData}${headTag.close[0]}`)
        : origData.replace(headTag.open[0], `${headTag.open[0]}${insertData}`);
}
exports.injectIntoHead = injectIntoHead;
