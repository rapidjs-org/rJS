/**
 * Dynamic file modification handler.
 * To be applied after having read a dynamic file.
 */


import {currentRequestInfo} from "../server/hook";

import {render as renderTemplating} from "./templating";
import {render as renderLocale} from "./locale/locale";


declare type renderer = (message: string, reducedRequestInfo?: IReducedRequestInfo, isImplicitRequest?: boolean) => string;

/**
 * Modification handler array to be worked like a queue.
 * Handlers to be applied in order of appearance.
 */
const handlerQueue: renderer[] = [
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
	// Retrieve realted redduced request info object if modifier is effective in request related routine
	const reducedRequestInfo: IReducedRequestInfo = currentRequestInfo();
	
	// Work handler queue
	handlerQueue.forEach((handler: renderer) => {
		message = handler(message, reducedRequestInfo, isImplicitRequest);	// TODO: Where require("../scope:common")?
	});

	return message;
}