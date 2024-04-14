const rJS = require("../debug/api");


const PORT = 8001;

module.exports = new Promise(resolve => {
    rJS.createServer({
        devMode: true,
        port: PORT,
        workingDir: __dirname
    })
    .then(() => {
        console.log(`Test application listening on port ${PORT}`);
        resolve();
    });
});