/**
 * Handler or data binding storage.
 * To be defined using a respective interface.
 * Read by a processing function unit.
 */

/**
 * List (array) of templating engines to be applied in order of registration.
 * Represented by callbacks getting passed the response data string to be modified,
 * the evaluated related handler module export object and the current (reduced) request object.
 */
export const templatingEngines: ITemplatingEngine[] = [];

/**
 * List (array) of templating engines to be applied in order of registration.
 * Represented by callbacks getting passed the response data string to be modified,
 * the evaluated related handler module export object and the current (reduced) request object.
 */
export const localeEngine: ILocaleEngine = {};


/**
 * List (array) of registered plug-in related data.
 * Integrated into the environment upon registration.
 * Binding storage to be utilized for organizational management.
 */
export const pluginRegistry: Map<string, IPlugin> = new Map();