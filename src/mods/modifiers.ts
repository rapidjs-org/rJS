/**
 * Dynamic file modification handler.
 * To be applied after having read a dynamic file.
 */


import {render as renderTemplating} from "./templating";
import {render as renderLocale} from "./locale";


/**
 * Modification handler array to be worked like a queue.
 * Handlers to be applied in order of appearance.
 */
const handlerQueue: ((message: string, isImplicitRequest?: boolean) => string)[] = [
	renderTemplating,
	renderLocale
];


/**
 * Apply registered modification handlers to response message.
 * Temporarily converts buffer to string representation for mutation.
 * @param {string} message Response message
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Modified response message
 */
export function renderModifiers(message: string, isImplicitRequest = false): string {
	// Work handler queue
	handlerQueue.forEach((handler: (message: string, isImplicitRequest?: boolean) => string) => {
		message = handler(message, isImplicitRequest);
	});

	return message;
}