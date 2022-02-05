/**
 * Web file system interface.
 */

import config from "../config.json";


import { existsSync, readFileSync } from "fs";
import { join, extname } from "path";

import { serverConfig } from "../config/config.server";

import { normalizeExtension } from "../utilities/normalize";

import { renderModifiers } from "../rendering/render";

// TODO: Bind file reader interface?


/**
 * Read a file from the web directory file system.
 * @param {string} pathname Path to file (relative to web directory root)
 * @returns {string} File contents
 * @throws ClientError (404) if file does not exist
 */
export function read(pathname: string): string {
	// Construct absolute path on local disc
	const localPath: string = join(serverConfig.directory.web, pathname);

	let contents = String(readFileSync(localPath));

	// Apply registered file modifiers if is dynamic file request
	contents = (normalizeExtension(extname(pathname)) === config.dynamicFileExtension)
		? renderModifiers(contents)
		: contents;

	return contents;
}

/**
 * Check whether a file exists at a given path in the web directory file system.
 * @param {string} pathname Path to file (relative to web directory root)
 * @returns {boolean} Whether file exists
 */
export function exists(pathname: string): boolean {
	return existsSync(join(serverConfig.directory.web, pathname)) ? true : false;
}