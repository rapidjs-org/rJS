/**
 * File modification detection and propagation for live functionality.
 */

const config = {
	detectionFrequency: 1000
};


import {readdir, stat, existsSync, Dirent} from "fs";
import {join} from "path";

import serverConfig from "../config/config.server";

import * as output from "../utilities/output";

import {proposeRefresh} from "./server";


// Array of detection directories
const detectionDirs: string[] = [];


// Watch web file directory
registerDetectionDir(serverConfig.directory.web);


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
 * @param {Function} [callback] Function to call if modification has been detected
 */
async function scanDir(path: string, callback?: () => void) {
	if(!existsSync(path)) {
		// Directory does not exist
		return;
	}
	
	// Read current directory
	readdir(path, {
		withFileTypes: true
	}, (_, dirents: Dirent[]) => {
		dirents.forEach(dirent => {
			const curPath: string = join(path, dirent.name);

			if(dirent.isDirectory()) {
				// Scan sub directory
				return scanDir(curPath);
			}
            
			// Read file stats to check for modification status
			stat(curPath, (_, stats) => {
				if(fileModified(stats.birthtime)
                || fileModified(stats.mtimeMs)) {
					// Change detected
					callback && callback();

					return proposeRefresh();	// Terminate current scanning process
				}
			});
		});
	});
}


/**
 * Register a directory for modification detection.
 * @param {string} directory Absolute path to directory
 */
export function registerDetectionDir(directory: string) {
	detectionDirs.push(directory);
}


// Initialize detection interval
setInterval(_ => {
	try {
		// Scan directories registered for change detection
		detectionDirs.forEach(dir => {
			scanDir(dir);
		});

		// TODO: Plug-in files
		// TODO: Templating files
	} catch(err) {
		output.log("An error occurred scanning project files for modification in live mode");
		output.error(err);
	}
}, config.detectionFrequency);