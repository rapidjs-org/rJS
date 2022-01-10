"use strict";
/**
 * Plug-in endpoint management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.use = exports.has = exports.setNamedEndpoint = exports.setDefaultEndpoint = void 0;
const config = {
    defaultEndpointName: "::default"
    // Must contain a plug-in name restricted character in order to prevent individual override
};
const ArbitraryCache_1 = require("../../server/support/cache/ArbitraryCache");
const hook_1 = require("../../server/hook");
const naming_1 = require("./naming");
/**
 * Endpoint cache (server cache duration; individually set in configuration file).
 * Optionally usable by plug-ins in order to cache endpoint responses.
 */
const cache = new ArbitraryCache_1.ArbitraryCache();
/**
 * Endpoint router data structure (2-level map).
 * Plug-in associated endpoint dictionaries.
 */
const endpointRouter = new Map();
/**
 * Set up an endpoint for the call respective plug-in in order to enable client-server-communication functionality.
 * @param {Function} callback 	  Callback getting passed the related body and (reduced) request info object
 * 							  	  in order to manipulate the response message accordingly
 * @param {boolean} [useCache] 	  Whether to cache the processed response using the server-side cache (false by default)
 * @param {string} [endpointName] Endpoint name for routing identification.
 * 								  Use case: multiple endpoints for a single plug-in
 * 								  Default name as set in internal config object (see above)
 */
function set(callback, useCache = false, endpointName = config.defaultEndpointName) {
    // Retrieve related plug-in name (call wise)
    const pluginName = (0, naming_1.getNameByCall)(__filename);
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
function setDefaultEndpoint(callback, useCache = false) {
    set(callback, useCache);
}
exports.setDefaultEndpoint = setDefaultEndpoint;
/**
 * Set up a named endpoint for the caller plug-in.
 * @param {string} endpointName Endpoint name
 * @param {EndpointCallback} callback Endpoint handler callback
 * @param {boolean} [useCache] Whether to cache the processed response using the server-side cache (false by default)
 */
function setNamedEndpoint(name, callback, useCache = false) {
    set(callback, useCache, name);
}
exports.setNamedEndpoint = setNamedEndpoint;
/**
 * Check whether a plug-in endpoint exists (generally or sepcifically, depending on second argument).
 * @param {string} pluginName Plug-in name
 * @param {string} [endpointName] Optional endpoint name
 * @returns {boolean} Whether (specific) endpoint exists
 */
function has(pluginName, endpointName) {
    return endpointRouter.has(pluginName)
        && endpointRouter.get(pluginName).has(endpointName || config.defaultEndpointName);
}
exports.has = has;
/**
 * Use an endpoint.
 * @param {string} pluginName Plug-in name
 * @param {Object} body Related body object
 * @param {string} [endpointName] Endpoint name
 * @returns {Buffer} Response data
 */
function use(pluginName, body, endpointName) {
    // Check whether endpoint exists
    if (!has(pluginName, endpointName)) {
        throw new ReferenceError(`Endpoint${endpointName ? ` '${endpointName}'` : ""} for plug-in '${pluginName}' does not exist.`);
    }
    // Retrieve handler (with name if given, default otherwise)
    const handler = endpointRouter.get(pluginName).get(endpointName || config.defaultEndpointName);
    // Use cached response if enabled and stored accordingly
    const cacheKey = `${pluginName}/${endpointName}`;
    if (handler.useCache && cache.exists(cacheKey)) {
        return cache.read(cacheKey);
    }
    /* const origLog = console.log;
    console.log = message => {
        process.stdout.write("Message from within endpoint:");
    }; */
    // Apply handler to retrieve response data
    const result = handler.callback.call(null, body, (0, hook_1.currentRequestInfo)());
    const data = !Buffer.isBuffer(result) ? Buffer.from(result, "utf-8") : result;
    // Write data to cache if enabled
    handler.useCache && (cache.write(cacheKey, data));
    /* console.log = origLog; */
    return data;
}
exports.use = use;
