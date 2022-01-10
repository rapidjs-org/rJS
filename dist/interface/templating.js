"use strict";
/**
 * Templating engine binding interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bind = void 0;
const bindings_1 = require("./bindings");
let engineCounter = 0;
/**
 * Bind optional templating handler.
 * @param {Function} callback Templating handler function being applied to any dynamic file data
 * @param {boolean} [implicitReadingOnly] Whether to render templating only if is a server implicit reading process (GET)
 * The callback is passed the response data string to be modified, the templating handler module export
 * object and the request object.
 */
function bind(callback, implicitReadingOnly = false) {
    bindings_1.templatingEngines.push({
        index: engineCounter++,
        callback,
        implicitReadingOnly
    });
}
exports.bind = bind;
