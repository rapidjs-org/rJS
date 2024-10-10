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
    });

    setImmediate(async () => {
        const result = await loadtest.loadTest({
            url: `http://localhost:${PORT}/`,
            maxRequests: 500,
            concurrency: 100
        });

        result.show();

        process.exit(+!!result.totalErrors);
    });
})();