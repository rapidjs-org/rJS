const {join} = require("path");
const {fork} = require("child_process");
const {readdir, stat} = require("fs");


const detectionFrequency = 2500;
let debugApp;

/**
 * (Re)start debug application.
 */
function startDebugApp() {
    // Stop currently running app (if not initial)
    debugApp && debugApp.kill("SIGTERM");

    // (Re)start app
    debugApp = fork(join(__dirname, "../debug:app/server"), [
        "-D",
        "-P",
        "../debug:app/"
    ]);

    debugApp.on("message", message => {
        console.log(message);
    });
}

/**
 * Recursively scan debug (development compilation) directory for changes.
 * Modification to be effective if a file has been chnaged within latest
 * detection period.
 * @param {String} [path] Detection path (debug root by default; initial call)
 */
function scanDebugDir(path = join(__dirname, "../debug")) {
    // Check whether a specific file has been modified within the past period
    const fileModified = time => {
        return (Math.abs(time - Date.now()) < detectionFrequency);
    };

	// Read current directory
	readdir(path, {
		withFileTypes: true
	}, (_, dirents) => {
		dirents.forEach(dirent => {
			const curPath = join(path, dirent.name);

			if(dirent.isDirectory()) {
				// Scan sub directory
				return scanDebugDir(curPath);
			}
            
			// Read file stats to check for modification status
			stat(curPath, (_, stats) => {
				if(fileModified(stats.birthtime)
                || fileModified(stats.mtimeMs)) {
					// Change detected
					startDebugApp();
				}
			});
		});
	});
}


// Initially start debug application
startDebugApp();

// Initialize detection interval (for app restart on changes)
setInterval(scanDebugDir, detectionFrequency);