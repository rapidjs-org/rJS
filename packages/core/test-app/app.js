const rJS_core = require("../debug/api");


const PORT = 8000;

module.exports = new Promise(resolve => {
    const requestHandler = new rJS_core.RequestHandler({
        workingDir: __dirname,
        renderers: [
            "./plugins/"
        ]
    });

    require("http")
    .createServer((req, res) => {
        requestHandler
        .apply(req, res);
    })
    .listen(PORT, () => {
        console.log(`Test application listening on port ${PORT}`);
        resolve();
    });
});