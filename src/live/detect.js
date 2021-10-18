const config = {
	detectionFrequency: 1000
};


const {readdir, stat} = require("fs");
const {join, dirname} = require("path");


const webPath = require("../support/web-path");

const liveServer = require("./server");


async function scanDir(path, callback) {
	readdir(path, {
		withFileTypes: true
	}, (_, dirents) => {
		dirents.forEach(dirent => {
			const recPath = join(path, dirent.name);

			if(dirent.isDirectory()) {
				if(dirent.name == "node_modules") {
					return;
				}

				scanDir(recPath);
                
				return;
			}
            
			stat(recPath, (_, stats) => {
				if(hasChanged(stats.birthtime)
                || hasChanged(stats.mtimeMs)) {
					callback && callback();

					liveServer.proposeRefresh();
				}
                
				function hasChanged(time) {
					return (Math.abs(time - Date.now()) < config.detectionFrequency);
				}
			});
		});
	});
}

setInterval(_ => {

	// Web files directory (recursively)
	scanDir(webPath);

	// Plug-in directories
	pluginPaths.forEach(path => {
		scanDir(dirname(path), _ => {
			require("../interface/plugin-management").reloadPlugin(path);
		});
	});

}, config.detectionFrequency);


const pluginPaths = [];

function registerPluginPath(path) {
	pluginPaths.push(path);
}


module.exports = {
	registerPluginPath    
};