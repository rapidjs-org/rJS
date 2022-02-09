/**
 * Class representing a plugin associated endpoint.
 * Statically managing all endpoints for plugin specific retrieval.
 */

const config = {
	defaultEndpointName: "::default"
	// ^ must contain a plugin name restricted character in order to prevent individual override
};


import { ArbitraryCache } from "../../server/cache/ArbitraryCache";

import { currentRequestInfo } from "../../server/hook";

import { Plugin } from "./Plugin";


type EndpointCallback = (body: unknown, req: IRequestObject) => void;

interface IEndpoint {
	callback: EndpointCallback;
	useCache: boolean;
}


export class Endpoint {
	/**
	 * Endpoint endpointRouter data structure
	 * (2-level map: plugin name > endpoint name > handler).
	 * Plugin associated endpoint dictionaries.
	 */
	private static readonly router: Map<string, Map<string, IEndpoint>> = new Map();
	/**
	 * Endpoint cache (server cache duration; individually set in configuration file).
	 * Optionally usable by plugins in order to cache endpoint responses.
	 */
	private static readonly cache: ArbitraryCache<Buffer> = new ArbitraryCache();

	/**
	 * Check whether a plugin endpoint exists (generally or sepcifically, depending on second argument).
	 * @param {string} pluginName Plug-in name
	 * @param {string} [endpointName] Optional endpoint name
	 * @returns {boolean} Whether (specific) endpoint exists
	 */
	public static has(pluginName: string, endpointName?: string): boolean {
		return this.router.has(pluginName)
		&& this.router.get(pluginName).has(endpointName || config.defaultEndpointName);
	}
	
	/**
	 * Use an endpoint.
	 * @param {string} pluginName Plug-in name 
	 * @param {Object} body Related body object
	 * @param {string} [endpointName] Endpoint name
	 * @returns {Buffer} Response data
	 */
	public static use(pluginName: string, body: unknown, endpointName?: string) {
		// Retrieve handler (with name if given, default otherwise)
		const handler: IEndpoint = this.router
		.get(pluginName)
		.get(endpointName || config.defaultEndpointName);	
		
		// Use cached response if enabled and stored accordingly
		const cacheKey = `${pluginName}/${endpointName}`;
		if(handler.useCache && this.cache.exists(cacheKey)) {
			return this.cache.read(cacheKey) as Buffer;
		}
		
		// Apply handler to retrieve response data
		const result: string|Buffer = handler.callback.call(null, body, currentRequestInfo());
		const data: Buffer = !Buffer.isBuffer(result) ? Buffer.from(JSON.stringify(result), "utf-8") : result;
	
		// Write data to cache if enabled
		handler.useCache
		&& this.cache.write(cacheKey, data);
		
		return data;
	}

	/**
	 * Set up an endpoint for the call respective plugin in order to enable client-server-communication functionality.
	 * @param {Function} callback 	  Callback getting passed the related body and (reduced) request info object
	 * 							  	  in order to manipulate the response message accordingly
	 * @param {boolean} [useCache] 	  Whether to cache the processed response using the server-side cache (false by default)
	 * @param {string} [endpointName] Endpoint name for routing identification.
	 * 								  Use case: multiple endpoints for a single plugin
	 * 								  Default name as set in internal config object (see above)
	 */
	constructor(callback: EndpointCallback, useCache = false, endpointName?: string) {		
		// Retrieve related plugin name (call wise)
		const pluginName: string = Plugin.getNameByCall(__filename);

		if(!endpointName) {
			endpointName = config.defaultEndpointName;
		} else if(!/^[a-z0-9_-]+$/i.test(endpointName)) {
			throw new SyntaxError(`Invalid name '${endpointName}' given defining an endpoint for Plug-in '${pluginName}'`);
		}

		// Create plugin specific sub map in the general endpointRouter map if not yet exists
		!Endpoint.router.has(pluginName)
		&& Endpoint.router.set(pluginName, new Map());

		Endpoint.router.get(pluginName).set(endpointName, {
			callback,
			useCache
		});
	}
}

/**
 * Set up the default endpoint for the caller plugin.
 * @param {EndpointCallback} callback Endpoint handler callback
 * @param {boolean} [useCache] Whether to cache the processed response using the server-side cache (false by default)
 */
export function setDefaultEndpoint(callback, useCache = false) {
	new Endpoint(callback, useCache);
}

/**
 * Set up a named endpoint for the caller plugin.
 * @param {string} endpointName Endpoint name
 * @param {EndpointCallback} callback Endpoint handler callback
 * @param {boolean} [useCache] Whether to cache the processed response using the server-side cache (false by default)
 */
export function setNamedEndpoint(name, callback, useCache = false) {
	new Endpoint(callback, useCache, name);
}	// TODO: Single method with overload?