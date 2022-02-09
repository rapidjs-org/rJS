/**
 * Abstract class representing an optional locale renderer to be bound
 * to the environment.
 * Constant locale information provided for locale related processing
 * of each request.
 */


import { output } from "../../utilities/output";


export abstract class Renderer {
    protected static readonly engines: IRenderingEngine[];
    protected static readonly caption: string;
    protected static readonly limit: number;

    /**
     * Iteratively apply bound rendering engines in order of registration.
     * @param {string} markup Markup to render
     * @returns {string} Rendered markup
     */
    protected static iterate(markup: string, isImplicitRequest: boolean, callbackArgs: unknown[]): string {
		this.engines
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
    				markup = engine.callback.apply(null, ([require("../scope:common"), markup] as unknown[]).concat(callbackArgs));

    				if(typeof(markup) !== "string") {
    					output.error(new SyntaxError(`Render of ${this.caption} engine is not a string, but has been stringified (check result)`));
    				}
    			} catch(err) {
    				output.log(`An error occurred applying ${this.caption} rendering engine:`);
    				output.error(err);
    			}
    		});

    	return markup;
    }

    /**
     * Bind an optional engine handler.
     * @param {Function} callback Templating handler function being applied to any dynamic file data
     * @param {boolean} [implicitReadingOnly] Whether to render templating only if is a server implicit reading process (GET) (false by default)
     */
    constructor(callback: RenderingCallback, implicitReadingOnly?: boolean) {
		const getChildStatic = name => {
			return this.constructor[name];
		};

    	if(getChildStatic("engines").length >= getChildStatic("limit")) {
    		throw new ReferenceError(`Trying to bind more ${getChildStatic("caption")} engines than allowed (max. ${getChildStatic("limit")}).`);
    	}

    	getChildStatic("engines").push({
    		callback,
    		implicitReadingOnly
    	});
    }
}