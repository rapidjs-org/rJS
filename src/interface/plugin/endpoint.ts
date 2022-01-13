/**
 * Plug-in endpoint management.
 */

const config = {
	defaultEndpointName: "::default"
	// Must contain a plug-in name restricted character in order to prevent individual override
};


import {ArbitraryCache} from "../../server/support/cache/ArbitraryCache";

import {currentRequestInfo} from "../../server/hook";

import {getNameByCall} from "./naming";



/**
 * Endpoint cache (server cache duration; individually set in configuration file).
 * Optionally usable by plug-ins in order to cache endpoint responses.
 */
const cache: ArbitraryCache<Buffer> = new ArbitraryCache();


type EndpointCallback = (body: unknown, req: IReducedRequestInfo) => void;

interface IEndpoint {
	callback: EndpointCallback;
	useCache: boolean;
}

/**
 * Endpoint router data structure (2-level map).
 * Plug-in associated endpoint dictionaries.
 */
const endpointRouter: Map<string, Map<string, IEndpoint>> = new Map();


/**
 * Set up an endpoint for the call respective plug-in in order to enable client-server-communication functionality.
 * @param {Function} callback 	  Callback getting passed the related body and (reduced) request info object
 * 							  	  in order to manipulate the response message accordingly
 * @param {boolean} [useCache] 	  Whether to cache the processed response using the server-side cache (false by default)
 * @param {string} [endpointName] Endpoint name for routing identification.
 * 								  Use case: multiple endpoints for a single plug-in
 * 								  Default name as set in internal config object (see above)
 */
function set(callback: EndpointCallback, useCache = false, endpointName: string = config.defaultEndpointName) {
	// Retrieve related plug-in name (call wise)
	const pluginName: string = getNameByCall(__filename);

	// Create plug-in specific sub map in the general router map if not yet exists
	!endpointRouter.has(pluginName) && endpointRouter.set(pluginName, new Map());

	endpointRouter.get(pluginName).set(endpointName, {
		callback,
		useCache
	});
}

/**
 * Set up the default endpoint for the caller plug-in.
 * @param {EndpointCallback} callback Endpoint handler callback
 * @param {boolean} [useCache] Whether to cache the processed response using the server-side cache (false by default)
 */
export function setDefaultEndpoint(callback, useCache = false) {
	set(callback, useCache);
}

/**
 * Set up a named endpoint for the caller plug-in.
 * @param {string} endpointName Endpoint name
 * @param {EndpointCallback} callback Endpoint handler callback
 * @param {boolean} [useCache] Whether to cache the processed response using the server-side cache (false by default)
 */
export function setNamedEndpoint(name, callback, useCache = false) {
	set(callback, useCache, name);
}

/**
 * Check whether a plug-in endpoint exists (generally or sepcifically, depending on second argument).
 * @param {string} pluginName Plug-in name
 * @param {string} [endpointName] Optional endpoint name
 * @returns {boolean} Whether (specific) endpoint exists
 */
export function has(pluginName: string, endpointName?: string): boolean {
	return endpointRouter.has(pluginName)
	&& endpointRouter.get(pluginName).has(endpointName || config.defaultEndpointName);
}

/**
 * Use an endpoint.
 * @param {string} pluginName Plug-in name 
 * @param {Object} body Related body object
 * @param {string} [endpointName] Endpoint name
 * @returns {Buffer} Response data
 */
export function use(pluginName: string, body: unknown, endpointName?: string) {
	// Check whether endpoint exists
	if(!has(pluginName, endpointName)) {
		throw new ReferenceError(`Endpoint${endpointName ? ` '${endpointName}'` : ""} for plug-in '${pluginName}' does not exist.`);
	}

	// Retrieve handler (with name if given, default otherwise)
	const handler: IEndpoint = endpointRouter.get(pluginName).get(endpointName || config.defaultEndpointName);	

	// Use cached response if enabled and stored accordingly
	const cacheKey = `${pluginName}/${endpointName}`;
	if(handler.useCache && cache.exists(cacheKey)) {
		return cache.read(cacheKey) as Buffer;
	}
	
	/* const origLog = console.log;
	console.log = message => {
		process.stdout.write("Message from within endpoint:");
	}; */
	
	// Apply handler to retrieve response data
	const result: string|Buffer = handler.callback.call(null, body, currentRequestInfo());
	const data: Buffer = !Buffer.isBuffer(result) ? Buffer.from(JSON.stringify(result), "utf-8") : result;

	// Write data to cache if enabled
	handler.useCache && (cache.write(cacheKey, data));
			
	/* console.log = origLog; */
	
	return data;
}