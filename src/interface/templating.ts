/**
 * Templating engine binding interface.
 */

import {templatingEngines} from "./bindings";

let engineCounter = 0;

/**
 * Bind optional templating handler.
 * @param {Function} callback Templating handler function being applied to any dynamic file data
 * @param {boolean} [implicitReadingOnly] Whether to render templating only if is a server implicit reading process (GET)
 * The callback is passed the response data string to be modified, the templating handler module export
 * object and the request object.
 */
export function bind(callback, implicitReadingOnly = false) {	// TODO: Page specific? Compound only?
	templatingEngines.push({
		index: engineCounter++,
		
		callback,
		implicitReadingOnly
	});
}