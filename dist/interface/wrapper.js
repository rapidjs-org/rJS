"use strict";
/**
 * Wrapper for interface .
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapInterface = void 0;
const output = __importStar(require("../utilities/output"));
/**
 *
 * @param {Function} method Interface method
 * @param {string} scopeDefinition Information to print along occuring errors in order to
 * @param {boolean} [terminateOnError] Whether to terminate application on error
 * @returns {any} Possible method return value
 */
function wrapInterface(method, scopeDefinition, terminateOnError = false) {
    return (...args) => {
        try {
            return method(...args);
        }
        catch (err) {
            output.log(`An error occurred${scopeDefinition ? ` ${scopeDefinition}` : ""}:`);
            output.error(err, terminateOnError);
        }
    };
}
exports.wrapInterface = wrapInterface;
