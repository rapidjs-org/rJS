/**
 * Class representing an individual client error.
 * Instance to be thrown for a respective response.
 */


import {ResponseError} from "./ResponseError";


export class ClientError extends ResponseError {
	/**
	 * @param {number} status Status code (within client error code range (4**))
	 * @param {string} message Optional description message
	 */
	constructor(status: number, message?: string) {
		super(4, status, message);
	}
}