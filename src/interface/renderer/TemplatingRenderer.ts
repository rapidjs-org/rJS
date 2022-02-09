
import config from "../../config.json";


import { join } from "path";
import { existsSync } from "fs";

import { serverConfig } from "../../config/config.server";

import { currentRequestInfo } from "../../server/hook";

import { Renderer } from "./Renderer";


export class TemplatingRenderer extends Renderer {
    protected static readonly engines: IRenderingEngine[] = [];
    protected static readonly limit = Infinity;
    protected static readonly caption = "SSR";

	constructor(callback, implicitReadingOnly?) {
		super(callback, implicitReadingOnly);
	}

    /**
     * Apply bound rendering engines in order of registration.
     * @param {string} markup Markup to render
     * @returns {string} Rendered markup
     */
	public static render(markup: string, isImplicitRequest?: boolean): string {
		const reducedRequestInfo: IRequestObject = currentRequestInfo();

		// Retrieve templating object if respective handler module exists (compound only)
		const templatingModulePath: string = join(serverConfig.directory.web, `${reducedRequestInfo.pathname.replace(/([^/]+$)/, `${config.privateWebFilePrefix}$1`)}.js`);
			
		let templatingObj = (reducedRequestInfo.isCompound && existsSync(templatingModulePath))
			? require(templatingModulePath)
			: {};
		templatingObj = (templatingObj instanceof Function)
			? templatingObj(require("../interface/scope:common"), reducedRequestInfo)	// Pass request info object to templating module if is exporting a function
			: templatingObj;	// Stateless templating otherwise (regarding the individual request)
		
		// Apply defined rendering engines
		markup = super.iterate(markup, isImplicitRequest, [templatingObj, reducedRequestInfo]);
		
		return markup;
    }
}

export function bindSSR(callback, implicitReadingOnly?) {
	return new TemplatingRenderer(callback, implicitReadingOnly);
}