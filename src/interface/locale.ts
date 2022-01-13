/**
 * Templating engine binding interface.
 */

import {localeEngine} from "./bindings";


/**
 * Bind optional locale handler.
 * @param {Function} callback Locale handler function being applied to any dynamic file data
 */
export function bind(callback) {
	localeEngine.callback = callback;
}