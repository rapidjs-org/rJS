/**
 * Templating engine binding interface.
 */

import config from "../config.json";


import {join} from "path";
import {existsSync} from "fs";

import * as output from "../utilities/output";
import webPath from "../utilities/web-path";

import {templatingEngines} from "../interface/bindings";


/**
 * Render templating into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Templated markup
 */
export function render(markup: string, reducedRequestInfo?: IReducedRequestInfo, isImplicitRequest = false): string {
	// Retrieve templating object if respective handler module exists (compound only)
	const templatingModulePath: string = join(webPath, `${reducedRequestInfo.pathname.replace(/([^/]+$)/, `${config.privateWebFilePrefix}$1`)}.js`);
	
	let templatingObj = (reducedRequestInfo.isCompound && existsSync(templatingModulePath))
	? require(templatingModulePath)
	: {};
	templatingObj = (templatingObj instanceof Function)
	? templatingObj(reducedRequestInfo)	// Pass request info object to templating module if is exporting a function
	: templatingObj;	// Stateless templating otherwise (regarding the individual request)
	
	console.log(templatingModulePath)
	console.log(templatingObj)
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
			try {
				markup = engine.callback(markup, templatingObj);
			} catch(err) {
				output.log(`An error occurred applying the rendering engine with index ${engine.index}:`);
				output.error(err);
			}
		});

	return markup;
}