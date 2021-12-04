/**
 * Templating engine binding interface.
 */

import {templatingEngines} from "../interface/bindings";

import {currentRequestInfo} from "../server/hook";


/**
 * Render templating into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Templated markup
 */
export function render(markup: string, isImplicitRequest = false): string {
	// TODO: Retrieve respectively evaluated templating module object
	const templatingObj = {};

	templatingEngines
	// Filter for request adepuate engines
		.filter(engine => {
			if(!isImplicitRequest) {
				return !engine.implicitReadingOnly;
			}

			return true;
		})
	// Apply each engine in order of registration
		.forEach(engine => {
			markup = engine.callback(markup, templatingObj, currentRequestInfo());
		});

	return markup;
}