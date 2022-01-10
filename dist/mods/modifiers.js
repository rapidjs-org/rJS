"use strict";
/**
 * Dynamic file modification handler.
 * To be applied after having read a dynamic file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderModifiers = void 0;
const hook_1 = require("../server/hook");
const templating_1 = require("./templating");
const locale_1 = require("./locale");
/**
 * Modification handler array to be worked like a queue.
 * Handlers to be applied in order of appearance.
 */
const handlerQueue = [
    templating_1.render,
    locale_1.render
];
/**
 * Apply registered modification handlers to response message.
 * Temporarily converts buffer to string representation for mutation.
 * @param {string} message Response message
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Modified response message
 */
function renderModifiers(message, isImplicitRequest = false) {
    // Retrieve realted redduced request info object if modifier is effective in request related routine
    const reducedRequestInfo = (0, hook_1.currentRequestInfo)();
    // Work handler queue
    handlerQueue.forEach((handler) => {
        message = handler(message, reducedRequestInfo, isImplicitRequest);
    });
    return message;
}
exports.renderModifiers = renderModifiers;
