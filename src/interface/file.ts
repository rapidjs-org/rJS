/**
 * Web file system interface.
 */

import config from "../config.json";


import {existsSync, readFileSync} from "fs";
import {join, extname} from "path";

import serverConfig from "../config/config.server";

import {normalizeExtension} from "../utilities/normalize";

import {renderModifiers} from "../mods/modifiers";

import {ClientError} from "./ClientError";


/**
 * Read a file from the web directory file system.
 * @param {string} pathname Path to file (relative to web directory root)
 * @returns {Buffer} File contents
 * @throws ClientError (404) if file does not exist
 */
export function read(pathname: string): Buffer {
	// Construct absolute path on local disc
	const localPath: string = join(serverConfig.webDirectory, pathname);
	
	if(!existsSync(localPath)) {
		// File not found
		throw new ClientError(404);
	}

	let contents = String(readFileSync(localPath));

	// Apply registered file modifiers if is dynamic file request
	contents = (normalizeExtension(extname(pathname)) === config.dynamicFileExtension)
		? renderModifiers(contents)
		: contents;

	return Buffer.from(contents, "utf-8");
}

/**
 * Check whether a file exists at a given path in the web directory file system.
 * @param {string} pathname Path to file (relative to web directory root)
 * @returns {boolean} Whether file exists
 */
export function exists(pathname: string) {
	return existsSync(join(serverConfig.webDirectory, pathname)) ? true : false;
}