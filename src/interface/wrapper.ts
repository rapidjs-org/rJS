/**
 * Wrapper for interface .
 */


import * as output from "../utilities/output";


/**
 * 
 * @param {Function} method Interface method 
 * @param {string} scopeDefinition Information to print along occuring errors in order to 
 * @param {boolean} [terminateOnError] Whether to terminate application on error
 * @returns {any} Possible method return value
 */
export function wrapInterface(method: (unknown) => unknown, scopeDefinition: string, terminateOnError = false): (unknown) => unknown {
	return (...args) => {
		try {
			return method(...args);
		} catch(err) {
			output.log(`An error occurred${scopeDefinition ? ` ${scopeDefinition}` : ""}:`);
			output.error(err, terminateOnError);
		}
	};
}