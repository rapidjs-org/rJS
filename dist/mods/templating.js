"use strict";
/**
 * Templating engine binding interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const bindings_1 = require("../interface/bindings");
const hook_1 = require("../server/hook");
/**
 * Render templating into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Templated markup
 */
function render(markup, isImplicitRequest = false) {
    // TODO: Retrieve respectively evaluated templating module object
    const templatingObj = {};
    bindings_1.templatingEngines
        // Filter for request adepuate engines
        .filter(engine => {
        if (!isImplicitRequest) {
            return !engine.implicitReadingOnly;
        }
        return true;
    })
        // Apply each engine in order of registration
        .forEach(engine => {
        markup = engine.callback(markup, templatingObj, (0, hook_1.currentRequestInfo)());
    });
    return markup;
}
exports.render = render;
