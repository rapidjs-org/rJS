"use strict";
/**
 * Class representing an individual client error.
 * Instance to be thrown for a respective response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientError = void 0;
class ClientError {
    /**
     * @param {number} status Status code (within client error code range (4**))
     */
    constructor(status) {
        if (!Number.isInteger(status)
            || status < 400
            || status > 499) {
            throw new RangeError(`Invalid client error status code ${status} given`);
        }
        this.status = status;
    }
}
exports.ClientError = ClientError;
