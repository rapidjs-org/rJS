"use strict";
/**
 * Application related output formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.log = void 0;
const config = {
    appName: "rJS"
};
/**
 * Log a application referenced message to the console (with prefix).
 * @param {string} message Message
 * @param {string} [style] Message styling in console code representation
 */
function log(message, style) {
    console.log(`\x1b[33m%s${style ? `${style}%s\x1b[0m` : "\x1b[0m%s"}`, `[${config.appName}] `, message);
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
    //console.group();
    console.error(Array.from(err.stack).map(cs => `at ${String(cs)}`).join("\n"));
    //console.groupEnd();
    terminate && process.exit();
}
exports.error = error;
