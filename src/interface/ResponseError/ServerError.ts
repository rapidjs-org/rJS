/**
 * Class representing an individual server error.
 * Instance to be thrown for a respective response.
 */


import {ResponseError} from "./ResponseError";


export class ServerError extends ResponseError {
    /**
     * @param {number} status Status code (within server error code range (5**))
     */
    constructor(status: number, message?: string) {
        super(5, status, message);
    }
}