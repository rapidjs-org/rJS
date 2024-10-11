const rjs = require("@rapidjs.org/rjs-server/build/api");

const PORT = 8100;

(async () => {
    const loadtest = await import("loadtest");

    await new rjs.createServer({
        port: PORT,
        cwd: require("path").join(__dirname, "../test-app"),
        apiDirPath: "./api",
        pluginDirPath: "./src",
        publicDirPath: "./public"
    }, {
        "security": {
            "maxRequestsPerMin": 0
        }
    });

    setImmediate(async () => {
        const result = await loadtest.loadTest({
            url: `http://localhost:${PORT}/`,
            maxRequests: 10000,
            concurrency: 100
        })

        console.log("\x1b[2K\r\x1b[1A\x1b[2K\r");
        result.show();

        process.exit(+!!result.totalErrors);
    });
})();