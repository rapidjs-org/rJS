"use strict";
/**
 * Dynamic file modification handler.
 * To be applied after having read a dynamic file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderModifiers = void 0;
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
    // Work handler queue
    handlerQueue.forEach((handler) => {
        message = handler(message, isImplicitRequest);
    });
    return message;
}
exports.renderModifiers = renderModifiers;
