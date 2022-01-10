"use strict";
/**
 * Class representing an individual client error.
 * Instance to be thrown for a respective response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientError = void 0;
const ResponseError_1 = require("./ResponseError");
class ClientError extends ResponseError_1.ResponseError {
    /**
     * @param {number} status Status code (within client error code range (4**))
     */
    constructor(status, message) {
        super(4, status, message);
    }
}
exports.ClientError = ClientError;
