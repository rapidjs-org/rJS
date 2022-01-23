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


// Display log write errors only once
let logWriteErr = false;

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
			if(err) {
				if(logWriteErr) {
					return;
				}

				logWriteErr = true;

				error(err);
			}	// TODO: Handle?
		});
}


/**
 * Log a application referenced message to the console (with app prefix).
 * @param {string} message Message
 * @param {string} [additionalPrefix] Additional prefix to display (after the general app prefix) (e.g. for plug-in logs)
 * @param {string} [styleCode] Individual message style code
 */
export function log(message: string, additionalPrefix?: string, styleCode?: string) {
	const messageParts = [];
	messageParts.push(`[${config.appName}]`);					// App prefix
	additionalPrefix && messageParts.push(`[${additionalPrefix}]`);	// Additional prefix if given
	messageParts.push(` ${message}`);									// Individual message
	
	console.log.apply(null, [`\x1b[33m%s${additionalPrefix ? "\x1b[34m%s" : ""}\x1b[${styleCode ? styleCode : "0m"}%s\x1b[0m`].concat(messageParts));
	
	// Also log message to file if configured and in productive environment
	isDevMode && serverConfig.directory.log
	&& writeToFile(`${additionalPrefix ? `[${additionalPrefix}] ` : ""}${JSON.stringify(message)}`);
}   // TODO: Implement color/style code enum?

/**
 * Log an error to the console.
 * @param {Error} err Error object
 * @param {boolean} [terminate=false] Whether to terminate application execution after error logging
 * @param {string} [additionalPrefix] Additional prefix to display (after the general app prefix) (e.g. for plug-in logs)
 */
export function error(err: Error, terminate = false, additionalPrefix?: string) {
	const message = (err instanceof Error) ? `${err.name}: ${err.message}` : err;
	
	log(message, additionalPrefix, "31m");
	
	console.error(Array.isArray(err.stack)
		? err.stack.map(cs => `at ${String(cs)}`).join("\n")
		: err.stack);
		
	terminate && process.exit();
}