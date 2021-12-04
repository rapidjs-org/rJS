/**
 * File modification detection and propagation for live functionality.
 */

const config = {
	detectionFrequency: 1000
};


import {readdir, stat, existsSync, Dirent} from "fs";
import {join} from "path";

import webPath from "../utilities/web-path";

import {proposeRefresh} from "./server";


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
 * @param {string} path Detection root path
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


// Initialize detection interval
setInterval(_ => {
	// Scan web files directory
	scanDir(webPath);

	// TODO: Plug-in files
	// TODO: Templating files

}, config.detectionFrequency);