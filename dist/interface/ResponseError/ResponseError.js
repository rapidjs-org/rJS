"use strict";
/**
 * Class representing an individual response error for closing a request irregularly.
 * Instance to be thrown for a respective response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseError = void 0;
class ResponseError {
    /**
     * @param {number} status Status code (within client error code range (4**))
     */
    constructor(leadingDigit, status, message) {
        const offset = leadingDigit * 100;
        if (!Number.isInteger(status)
            || status < offset
            || status > (offset + 99)) {
            throw new RangeError(`Invalid error status code thrown '${status}' [${offset}, ${offset + 99}]`);
        }
        this.status = status;
        this.message = message;
    }
}
exports.ResponseError = ResponseError;
