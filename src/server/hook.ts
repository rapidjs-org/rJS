/**
 * Request/response entity management using the asynchronous hook API
 * in order to identify entites across different modules based on the
 * currently active asynchronous thread.
 */


// Create and enable asynchronous hook
import asyncHooks from "async_hooks";

import {Entity} from "./entity/Entity";


const requests = new Map();

const asyncHook = asyncHooks.createHook({
	init: (asyncId, _, triggerAsyncId) => {
		requests.has(triggerAsyncId)
        && requests.set(asyncId, requests.get(triggerAsyncId));
	},
	destroy: asyncId => {
		requests.has(asyncId) && requests.delete(asyncId);
	}
});

asyncHook.enable();


/**
 * Create entity object based on web server induced request/response objects.
 * @param {Entity} entity Request/response entity
 */
export function createHook(entity: Entity) {
	requests.set(asyncHooks.executionAsyncId(), entity);
}

/**
 * Get currently effective request info object (based on asynchronous thread).
 * @returns {IReducedRequestInfo} Reduced request info object
 */
export function currentRequestInfo(): IReducedRequestInfo {
	return requests.get(asyncHooks.executionAsyncId()).getReducedRequestInfo();
}