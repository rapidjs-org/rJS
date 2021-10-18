const config = {
    detectionFrequency: 1000
};


const {readdir, stat} = require("fs");
const {join} = require("path");


const webPath = require("../support/web-path");


module.exports = proposeRefresh => {

    async function scanDir(path = webPath) {
        readdir(path, {
            withFileTypes: true
        }, (_, dirents) => {
            dirents.forEach(dirent => {
                const recPath = join(path, dirent.name);

                if(dirent.isDirectory()) {
                    scanDir(recPath);
                    
                    return;
                }
                
                stat(recPath, (_, stats) => {
                    if(hasChanged(stats.birthtime)
                    || hasChanged(stats.mtimeMs)) {
                        proposeRefresh();
                    }
                    
                    function hasChanged(time) {
                        return (Math.abs(time - Date.now()) < config.detectionFrequency);
                    }
                });
            });
        });
    }
    
    setInterval(_ => {
        scanDir();
    }, config.detectionFrequency);
    
};