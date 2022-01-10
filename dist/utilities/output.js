"use strict";
/**
 * Application related output formatting.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.log = void 0;
const config = {
    appName: "rJS"
};
const fs_1 = require("fs");
const path_1 = require("path");
const config_server_1 = __importDefault(require("../config/config.server"));
const is_dev_mode_1 = __importDefault(require("../utilities/is-dev-mode"));
/**
 * Write logged message to log file if
 * @param {string} message Message
 */
function writeToFile(message) {
    const date = new Date();
    const day = date.toISOString().split("T")[0];
    const time = date.toLocaleTimeString();
    (0, fs_1.appendFile)((0, path_1.join)(config_server_1.default.directory.log, `${day}.log`), `[${time}]: ${message}\n`, err => {
        if (err) { } // TODO: Handle?
    });
}
/**
 * Log a application referenced message to the console (with prefix).
 * @param {string} message Message
 * @param {string} [style] Message styling in console code representation
 */
function log(message, style) {
    console.log(`\x1b[33m%s${style ? `${style}%s\x1b[0m` : "\x1b[0m%s"}`, `[${config.appName}] `, message);
    // Also log message to file if configured and in productive environment
    is_dev_mode_1.default && config_server_1.default.directory.log
        && writeToFile(message);
} // TODO: Implement color/style code enum?
exports.log = log;
/**
 * Log an error to the console.
 * @param {Error} err Error object
 * @param {boolean} [terminate=false] Whether to terminate application execution after error logging
 */
function error(err, terminate = false) {
    const message = (err instanceof Error) ? `${err.name}: ${err.message}` : err;
    log(message, "\x1b[31m");
    console.error(Array.isArray(err.stack)
        ? err.stack.map(cs => `at ${String(cs)}`).join("\n")
        : err.stack);
    terminate && process.exit();
}
exports.error = error;
