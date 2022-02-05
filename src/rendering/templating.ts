/**
 * Rendering engine for templating (SSR).
 */

import config from "../config.json";


import { join } from "path";
import { existsSync } from "fs";

import { serverConfig } from "../config/config.server";

import { ssrEngine } from "../interface/bindings";


/**
 * Render templating into given response message markup.
 * @param {string} markup Response message markup to be modified / rendered
 * @param {IRequestObject} req Related reduced request info object
 * @param {boolean} [isImplicitRequest] Whether the modifier has been called upon an implicit request / reading process
 * @returns {string} Templated markup
 */
export default function(markup: string, reducedRequestInfo?: IRequestObject, isImplicitRequest = false): string {
	// Retrieve templating object if respective handler module exists (compound only)
	const templatingModulePath: string = join(serverConfig.directory.web, `${reducedRequestInfo.pathname.replace(/([^/]+$)/, `${config.privateWebFilePrefix}$1`)}.js`);
		
	let templatingObj = (reducedRequestInfo.isCompound && existsSync(templatingModulePath))
		? require(templatingModulePath)
		: {};
	templatingObj = (templatingObj instanceof Function)
		? templatingObj(require("../interface/scope:common"), reducedRequestInfo)	// Pass request info object to templating module if is exporting a function
		: templatingObj;	// Stateless templating otherwise (regarding the individual request)
	
	// Apply defined rendering engines
	markup = ssrEngine.apply(markup, [templatingObj, reducedRequestInfo], isImplicitRequest);
	

	return markup;
}