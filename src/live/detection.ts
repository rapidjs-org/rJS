/**
 * File modification detection and propagation for live functionality.
 */

const config = {
	detectionFrequency: 1000
};


import {readdir, stat, lstatSync, existsSync, Dirent} from "fs";
import {join} from "path";

import * as output from "../utilities/output";
import isDevMode from "../utilities/is-dev-mode";

import {proposeRefresh} from "./server";


// Array of detection directories
const modRegistry: {
	path: string;
	recursive: boolean;

	callback: () => void;
}[] = [];


/**
 * Check whether a file has been modified within the last detection period
 * based on a given modification reference timestamp.
 * @param {number} time Modification reference timestamp
 * @returns {boolean} Whether has been modified
 */
function fileModified(time) {
	return (Math.abs(time - Date.now()) < config.detectionFrequency);
}

/**
 * Recursively scan a given directory for moification.
 * Modification to be effective if a file has been chnaged within
 * latest detection period.
 * @param {string} path Detection path (starting from root)
 * @param {Function} callback Function to call if modification has been detected
 */
async function scanDir(path: string, callback: () => void, recursive = true) {
	if(!existsSync(path)) {
		// Directory does not exist
		return;
	}

	// Read current directory
	readdir(path, {
		withFileTypes: true
	}, (_, dirents: Dirent[]) => {
		(dirents || []).forEach(dirent => {
			const curPath: string = join(path, dirent.name);

			if(recursive && dirent.isDirectory()) {
				// Scan sub directory
				return scanDir(curPath, callback, recursive);
			}

			checkFile(curPath, callback);
		});
	});
}

/**
 * Scan a specific file for modification.
 * Modification to be effective if a file has been chnaged within
 * latest detection period.
 * @param {string} path Path to file
 * @param {Function} callback Function to call if modification has been detected
 */
async function checkFile(path, callback) {
	// Read file stats to check for modification status
	stat(path, (_, stats) => {
		if(fileModified(stats.birthtime)
		|| fileModified(stats.mtimeMs)) {
			output.log(`File modified: Initiated live reload\n- ${path}`);
			
			// Change detected (TODO: Cancel further check up as of is suffiecient for performing result action)
			callback && callback();

			proposeRefresh();	// Always also reloas connected web client views
		}
	});
}


/**
 * Register a directory for modification detection.
 * @param {string} path Absolute path to directory
 * @param {Function} callback Function to call if modification has been detected
 */
export function registerDetection(path: string, callback?: () => void, scanRecursively = true) {
	if(!isDevMode) {
		// DEV MODE only
		return;
	}

	modRegistry.push({
		path: path,
		recursive: scanRecursively,
		callback: callback
	});
}


// Initialize detection interval
setInterval(_ => {
	try {
		// Scan registered directories / files respectively
		modRegistry.forEach(mod => {
			lstatSync(mod.path).isDirectory() 
				? scanDir(mod.path, mod.callback, mod.recursive)
				: checkFile(mod.path, mod.callback);
		});
	} catch(err) {
		output.log("An error occurred scanning project files for modification in live mode");
		output.error(err);
	}
}, config.detectionFrequency);