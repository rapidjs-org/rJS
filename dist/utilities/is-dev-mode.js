"use strict";
/**
 * Retrieve whether the environment has been started in DEV MODE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    argument: "-dev",
};
exports.default = ((process.argv.length > 2) && (process.argv.slice(2).includes(config.argument)))
    ? true
    : false;
