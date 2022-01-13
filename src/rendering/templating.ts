/**
 * Rendering engine for templating (SSR).
 */

import config from "../config.json";


import {join} from "path";
import {existsSync} from "fs";

import serverConfig from "../config/config.server";

import * as output from "../utilities/output";

import {templatingEngines} from "../interface/bindings";


/**
 * Render templating into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {IReducedRequestInfo} req Related reduced request info object
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Templated markup
 */
export function render(markup: string, reducedRequestInfo?: IReducedRequestInfo, isImplicitRequest = false): string {
	// Retrieve templating object if respective handler module exists (compound only)
	const templatingModulePath: string = join(serverConfig.directory.web, `${reducedRequestInfo.pathname.replace(/([^/]+$)/, `${config.privateWebFilePrefix}$1`)}.js`);
	// TODO: .ts?
	
	let templatingObj = (reducedRequestInfo.isCompound && existsSync(templatingModulePath))
		? require(templatingModulePath)
		: {};
	templatingObj = (templatingObj instanceof Function)
		? templatingObj(reducedRequestInfo)	// Pass request info object to templating module if is exporting a function
		: templatingObj;	// Stateless templating otherwise (regarding the individual request)
	
	templatingEngines
	// Filter for request adequate engines
		.filter(engine => {
			if(!isImplicitRequest) {
				return !engine.implicitReadingOnly;
			}

			return true;
		})
	// Apply each engine in order of registration
		.forEach(engine => {
			try {
				markup = engine.callback(markup, templatingObj, reducedRequestInfo);
			} catch(err) {
				output.log(`An error occurred applying the rendering engine with index ${engine.index}:`);
				output.error(err);
			}
		});

	return markup;
}