"use strict";
/**
 * Class representing an individual server error.
 * Instance to be thrown for a respective response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerError = void 0;
const ResponseError_1 = require("./ResponseError");
class ServerError extends ResponseError_1.ResponseError {
    /**
     * @param {number} status Status code (within server error code range (5**))
     */
    constructor(status, message) {
        super(5, status, message);
    }
}
exports.ServerError = ServerError;
