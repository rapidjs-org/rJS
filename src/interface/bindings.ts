/**
 * Handler or data binding storage.
 * To be defined using a respective interface.
 * Read by a processing function unit.
 */


import * as output from "../utilities/output";


/**
 * Class representing a render callback binding.
 * Callbacks to be applied to markup ("render") in order of registration (with registration limit).
 */
class RenderBinding {
    private engineStore: IRenderingEngine[];
    private caption: string;
    private limit: number;

    public length: number = 0;

    constructor(caption: string, limit: number = Infinity) {
        this.caption = caption;
        this.limit = limit;
        this.engineStore = [];
    }

    /**
     * Bind an optional engine handler.
     * @param {Function} callback Templating handler function being applied to any dynamic file data
     * @param {boolean} [implicitReadingOnly] Whether to render templating only if is a server implicit reading process (GET) (false by default)
     */
    public bind(callback: (message: string, handlerObj?: Record<string, unknown>, req?: IReducedRequestInfo) => string, implicitReadingOnly?: boolean) {
        if(this.engineStore.length >= this.limit) {
            throw new ReferenceError(`Trying to bind more ${this.caption} engines than allowed (max. ${this.limit}).`);
        }

        this.length++;

        this.engineStore.push({
            callback,
            implicitReadingOnly
        });
    }
    /**
     * Apply bound rendering engines in order of registration.
     * @param {string} markup Markup to render
     * @returns {string} Rendered markup
     */
    public apply(markup: string, callbackArgs: unknown[], isImplicitRequest?: boolean): string {
        this.engineStore
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
				markup = engine.callback[0].apply(null, ([markup] as unknown[]).concat(callbackArgs));
			} catch(err) {
				output.log(`An error occurred applying a ${this.caption} rendering engine:`);
				output.error(err);
			}
		});

        return markup;
    }
}


/**
 * List (array) of templating engines to be applied in order of registration.
 * Represented by callbacks getting passed the response data string to be modified,
 * the evaluated related handler module export object and the current (reduced) request object.
 */
export const ssrEngine: RenderBinding = new RenderBinding("SSR"); 

/**
 * Optionally bound ocale engine.
 * Represented by a callback getting passed the response data string to be modified,
 * the locale object and the translation object.
 */
export const localeEngine: RenderBinding = new RenderBinding("locale", 1); 


export function bindSSR(...args) {
    return ssrEngine.bind.call(ssrEngine, args);
}

export function bindLocale(...args) {
    return localeEngine.bind.call(localeEngine, args);
}




/**
 * List (array) of registered plug-in related data.
 * Integrated into the environment upon registration.
 * Binding storage to be utilized for organizational management.
 */
export const pluginRegistry: Map<string, IPlugin> = new Map();