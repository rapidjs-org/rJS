/**
 * Application related output formatting.
 */

const config = {
	appName: "rJS"
};


import {appendFile} from "fs";
import {join} from "path";

import serverConfig from "../config/config.server";

import isDevMode from "../utilities/is-dev-mode";


/**
 * Write logged message to log file if 
 * @param {string} message Message
 */
function writeToFile(message) {
	const date: Date = new Date();
	const day: string = date.toISOString().split("T")[0];
	const time: string = date.toLocaleTimeString();

	appendFile(join(serverConfig.directory.log, `${day}.log`),
	`[${time}]: ${message}\n`,
	err => {
		if(err) {}	// TODO: Handle?
	});
}


/**
 * Log a application referenced message to the console (with prefix).
 * @param {string} message Message
 * @param {string} [style] Message styling in console code representation
 */
export function log(message: string, style?: string) {
	console.log(`\x1b[33m%s${style ? `${style}%s\x1b[0m` : "\x1b[0m%s"}`, `[${config.appName}] `, message);

	// Also log message to file if configured and in productive environment
	isDevMode && serverConfig.directory.log
	&& writeToFile(message);
}   // TODO: Implement color/style code enum?

/**
 * Log an error to the console.
 * @param {Error} err Error object
 * @param {boolean} [terminate=false] Whether to terminate application execution after error logging
 */
export function error(err: Error, terminate = false) {
	const message = (err instanceof Error) ? `${err.name}: ${err.message}` : err;
	
	log(message, "\x1b[31m");
	
	console.error(Array.isArray(err.stack)
	? err.stack.map(cs => `at ${String(cs)}`).join("\n")
	: err.stack);
		
	terminate && process.exit();
}