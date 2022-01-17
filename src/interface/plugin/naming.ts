/**
 * Plug-in naming related routines.
 */


import {existsSync} from "fs";
import {join, dirname} from "path";

import {truncateModuleExtension} from "../../utilities/normalize";

import {pluginRegistry} from "../bindings";


/**
 * Get path to plug-in module that activated calling function.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in module / caller path
 */
function getCallerPath(fileName: string): string {
	const err = new Error();
    
	Error.prepareStackTrace = (_, stack) => {
		return stack;
	};

	while(err.stack.length) {
		// @ts-ignore
		if(![fileName || "", __filename].includes(err.stack.shift().getFileName())) {
			// @ts-ignore
			return err.stack.shift().getFileName();
		}
	}
    
	throw new ReferenceError("Failed to retrieve path to plug-in caller module");
}

/**
 * Get a plug-in directory path by respective module motivated call.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in path
 */
export function getPathByCall(fileName: string): string {
	return dirname(getCallerPath(fileName));
}

/**
 * Get a plug-in name by respective module motivated call.
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in name
 */
export function getNameByCall(fileName: string): string {
	const path = truncateModuleExtension(getCallerPath(fileName));

	// Iterate plug-in registry for matching plug-in and caller path to retrieve related name
	try {
		pluginRegistry.forEach((_, name: string) => {
			if(pluginRegistry.get(name).path === path) {
				throw name;
			}
		});
	} catch(thrown: unknown) {
		// Use thrown string as for callback loop break
		if(typeof thrown === "string") {
			return String(thrown);	// TODO: Store in map?
		}

		// Pass possible actual error
		throw thrown;
	}

	return undefined;
}

/**
 * Get a plug-in name by reference (dependency identifier or file system path).
 * Name derivation strategy:
 * Use dependency identifier if given
 * Use package name if exists at given path
 * Use resolving base file name (without extension) otherwise
 * @param {string} fileName Name of current file for checking against (use __filename)
 * @returns {string} Plug-in name
 */
export function getNameByReference(reference: string): string {
	// Installed plug-in dependency (use package name as given)
	if(!/^((\.)?\.)?\//.test(reference)) {
		return reference.toLowerCase();
	}

	// Locally deployed plug-in, path given (construct absolute local path file name)
	if(/^[^/]/.test(reference)) {
		reference = join(dirname(require.main.filename), reference);
	}
	
	const packagePath = join(dirname(reference), "package.json");
	const name = existsSync(packagePath) ? require(packagePath).name : null;
	if(name) {
		// Local plug-in with named package (use package name)
		return name.toLowerCase();
	}

	// Local plug-in without (named) package (use file name (without extension))
	return truncateModuleExtension(reference.match(/([^/]+\/)?[^/]+$/)[0]);
}